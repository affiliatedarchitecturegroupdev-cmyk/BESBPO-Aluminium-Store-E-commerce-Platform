"""
Aluminium Store Pricing Microservice
=====================================
A Specialised Operating Division of Besbpo Group.

Implements the exact Area Rate cost model verified in the Pricing Framework workbook
(Aluminium-Store-Pricing-Framework-v1.0.xlsx). `assumptions.json` in this directory is the
same assumption data the workbook's Cost Assumptions sheet was built from — the intent is
that this file is regenerated from the workbook (not hand-edited) whenever pricing changes,
so the API and the spreadsheet never drift apart. See docs/05-pricing-integration.md.
"""
import json
from pathlib import Path
from typing import Optional, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

ASSUMPTIONS = json.loads((Path(__file__).parent / "assumptions.json").read_text())

app = FastAPI(title="Aluminium Store Pricing Service", version="1.0.0")


class PriceRequest(BaseModel):
    productId: str
    subCategory: str  # e.g. "Sliding Windows" — matches AREA_RATE_PER_M2 keys
    category: str  # e.g. "Windows" — matches MARKUP_BY_CATEGORY keys
    widthMm: int
    heightMm: int
    glazingSpec: str  # matches GLAZING_UPGRADE_PER_M2 keys
    discountTier: Optional[Literal["RETAIL", "TRADE", "VOLUME"]] = "RETAIL"


class PriceResponse(BaseModel):
    baseCost: float
    markupPct: float
    retail: float
    trade: float
    volume: float


def compute_area_rate_price(req: PriceRequest) -> float:
    """
    Mirrors the FRAME_GLAZED / FRAME_ONLY branch of the Priced Catalogue formulas:
        BaseCost = area_m2 * (AreaRate[subCategory] + GlazingUpgrade[glazingSpec])
                   + HardwareAllowance[category or subCategory]
    """
    area_m2 = (req.widthMm * req.heightMm) / 1_000_000
    area_rate = ASSUMPTIONS["AREA_RATE_PER_M2"].get(req.subCategory)
    if area_rate is None:
        raise HTTPException(422, f"Unknown sub-category for area-rate pricing: {req.subCategory}")

    glazing_upgrade = ASSUMPTIONS["GLAZING_UPGRADE_PER_M2"].get(req.glazingSpec, 0)
    hardware = ASSUMPTIONS["HARDWARE_ALLOWANCE"].get(
        req.category, ASSUMPTIONS["HARDWARE_ALLOWANCE"].get(req.subCategory, 0)
    )
    return area_m2 * (area_rate + glazing_upgrade) + hardware


def markup_for(category: str, sub_category: str) -> float:
    override = ASSUMPTIONS["MARKUP_BY_SUBCATEGORY_OVERRIDE"].get(sub_category)
    if override is not None:
        return override
    pct = ASSUMPTIONS["MARKUP_BY_CATEGORY"].get(category)
    if pct is None:
        raise HTTPException(422, f"No markup band configured for category: {category}")
    return pct


@app.post("/price", response_model=PriceResponse)
def price(req: PriceRequest) -> PriceResponse:
    base_cost = compute_area_rate_price(req)
    markup_pct = markup_for(req.category, req.subCategory)
    retail = base_cost * (1 + markup_pct)
    trade = retail * (1 - ASSUMPTIONS["TRADE_DISCOUNT"])
    volume = retail * (1 - ASSUMPTIONS["VOLUME_DISCOUNT"])
    return PriceResponse(
        baseCost=round(base_cost, 2),
        markupPct=markup_pct,
        retail=round(retail, 2),
        trade=round(trade, 2),
        volume=round(volume, 2),
    )


@app.get("/health")
def health():
    return {"status": "ok", "assumptionsLoaded": len(ASSUMPTIONS)}
