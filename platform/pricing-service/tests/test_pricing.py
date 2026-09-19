"""
Pricing service tests.

These exercise the real cost model against the real assumptions.json — no mocks, no stubbed
rates. The numbers asserted below are derived from the formula in the module docstring, not
copied from a recorded response, so a change to the model that silently shifts prices will
fail here.
"""
import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# The service is a flat directory, not an installed package, so make `main` importable when
# pytest is invoked from the repository root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import ASSUMPTIONS, PriceRequest, app, compute_area_rate_price, markup_for  # noqa: E402

client = TestClient(app)

SUB_CATEGORY = next(iter(ASSUMPTIONS["AREA_RATE_PER_M2"]))
CATEGORY = next(iter(ASSUMPTIONS["MARKUP_BY_CATEGORY"]))


def make_request(**overrides) -> PriceRequest:
    fields = {
        "productId": "test-product",
        "subCategory": SUB_CATEGORY,
        "category": CATEGORY,
        "widthMm": 1800,
        "heightMm": 1200,
        "glazingSpec": next(iter(ASSUMPTIONS["GLAZING_UPGRADE_PER_M2"]), ""),
        "discountTier": "RETAIL",
    }
    fields.update(overrides)
    return PriceRequest(**fields)


# ---------------------------------------------------------------- assumptions file

def test_assumptions_file_loads():
    # The service is only meaningful if its assumption set was found next to it.
    assert isinstance(ASSUMPTIONS, dict)
    assert len(ASSUMPTIONS) > 0


def test_assumptions_file_is_valid_json_and_has_required_keys():
    path = Path(__file__).resolve().parent.parent / "assumptions.json"
    json.loads(path.read_text())
    for key in ("AREA_RATE_PER_M2", "GLAZING_UPGRADE_PER_M2", "MARKUP_BY_CATEGORY"):
        assert key in ASSUMPTIONS, f"assumptions.json is missing {key}"


# ---------------------------------------------------------------- cost model

def test_area_is_computed_in_square_metres():
    # 1000 x 1000 mm is 1 m2, so the cost is exactly rate + hardware. A mm/m2 mix-up would be
    # off by a factor of a million.
    req = make_request(widthMm=1000, heightMm=1000, glazingSpec="")
    area_rate = ASSUMPTIONS["AREA_RATE_PER_M2"][req.subCategory]
    hardware = ASSUMPTIONS["HARDWARE_ALLOWANCE"].get(
        req.category, ASSUMPTIONS["HARDWARE_ALLOWANCE"].get(req.subCategory, 0)
    )
    assert compute_area_rate_price(req) == pytest.approx(area_rate + hardware)


def test_glazing_upgrade_is_added_to_the_rate():
    glazing_key = next(k for k, v in ASSUMPTIONS["GLAZING_UPGRADE_PER_M2"].items() if v > 0)
    plain = make_request(glazingSpec="")
    glazed = make_request(glazingSpec=glazing_key)
    delta = ASSUMPTIONS["GLAZING_UPGRADE_PER_M2"][glazing_key] * 2.16
    assert compute_area_rate_price(glazed) - compute_area_rate_price(plain) == pytest.approx(delta)


def test_unknown_sub_category_is_rejected():
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        compute_area_rate_price(make_request(subCategory="No Such Sub-Category"))
    assert exc.value.status_code == 422


def test_unknown_category_has_no_markup_band():
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        markup_for("No Such Category", "No Such Sub-Category")
    assert exc.value.status_code == 422


def test_sub_category_override_beats_category_band():
    override = ASSUMPTIONS["MARKUP_BY_SUBCATEGORY_OVERRIDE"]
    if not override:
        pytest.skip("no sub-category markup overrides configured")
    sub, pct = next(iter(override.items()))
    assert markup_for("Anything", sub) == pct


# ---------------------------------------------------------------- tiers

def test_trade_and_volume_are_discounted_below_retail():
    resp = client.post("/price", json=make_request().model_dump())
    assert resp.status_code == 200
    body = resp.json()
    assert body["volume"] < body["trade"] < body["retail"]


def test_tiers_match_the_configured_discounts():
    resp = client.post("/price", json=make_request().model_dump())
    body = resp.json()
    retail = body["retail"]
    assert body["trade"] == pytest.approx(retail * (1 - ASSUMPTIONS["TRADE_DISCOUNT"]), abs=0.01)
    assert body["volume"] == pytest.approx(retail * (1 - ASSUMPTIONS["VOLUME_DISCOUNT"]), abs=0.01)


def test_retail_is_cost_plus_markup():
    resp = client.post("/price", json=make_request().model_dump())
    body = resp.json()
    assert body["retail"] == pytest.approx(body["baseCost"] * (1 + body["markupPct"]), abs=0.01)


def test_price_scales_with_area():
    small = client.post("/price", json=make_request(widthMm=500, heightMm=500).model_dump()).json()
    large = client.post("/price", json=make_request(widthMm=2000, heightMm=2000).model_dump()).json()
    assert large["baseCost"] > small["baseCost"]


# ---------------------------------------------------------------- http contract

def test_health_reports_assumptions_loaded():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["assumptionsLoaded"] == len(ASSUMPTIONS)


def test_response_carries_every_tier_the_backend_depends_on():
    # The backend's cart and configurator read these keys; a missing one is an integration break.
    resp = client.post("/price", json=make_request().model_dump())
    for key in ("baseCost", "markupPct", "retail", "trade", "volume"):
        assert key in resp.json(), f"price response is missing {key}"


# ---------------------------------------------------------------- workbook anchors

# README.md and docs/05-pricing-integration.md both state that the service reproduces the Pricing
# Framework workbook to the cent. Those two figures are the evidence for that claim, and they were
# previously only ever checked by hand in a chat session. Pinning them here means the claim fails
# loudly if the assumption data drifts.
@pytest.mark.parametrize(
    "width_mm,height_mm,sub_category,category,glazing,expected_retail",
    [
        (1209, 909, "Sliding Windows", "Windows", "Standard Single-Glazed (4mm Clear Float)", 3944.27),
        (1209, 1209, "Casement Windows", "Windows", "Standard Single-Glazed (4mm Clear Float)", 4713.73),
    ],
)
def test_matches_verified_workbook_figures(
    width_mm, height_mm, sub_category, category, glazing, expected_retail
):
    resp = client.post(
        "/price",
        json=make_request(
            widthMm=width_mm, heightMm=height_mm, subCategory=sub_category,
            category=category, glazingSpec=glazing,
        ).model_dump(),
    )
    assert resp.status_code == 200
    assert resp.json()["retail"] == pytest.approx(expected_retail, abs=0.01)


def test_missing_required_field_is_rejected():
    payload = make_request().model_dump()
    del payload["widthMm"]
    assert client.post("/price", json=payload).status_code == 422


def test_invalid_dimension_type_is_rejected():
    # Send the raw payload rather than building a PriceRequest, so the rejection under test is
    # FastAPI's request validation and not pydantic's constructor.
    payload = make_request().model_dump()
    payload["widthMm"] = "not-a-number"
    assert client.post("/price", json=payload).status_code == 422


def test_unknown_sub_category_over_http_is_422_not_500():
    resp = client.post("/price", json=make_request(subCategory="No Such Sub-Category").model_dump())
    assert resp.status_code == 422