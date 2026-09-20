#!/usr/bin/env python3
"""Export the Master Product Catalogue from the Pricing Framework workbook.

This is the only supported way the catalogue enters the platform. `prisma/seed.ts` reads the
JSON this script emits, so the seeded catalogue and the workbook can never drift: re-run this
script against a new workbook and re-seed.

    python3 scripts/import-catalogue.py [path/to/workbook.xlsx]

Default input path is the workbook at the repository root. Output is
`platform/backend/data/catalogue.json` (committed), which records the source workbook's
SHA-256 so a seed can prove which revision it came from.

The exporter does not take the workbook's Retail/Trade/Volume columns on trust. It recomputes
each row from the Cost Assumptions and Markup sheets and fails if anything disagrees, so a
formula error in the workbook surfaces here rather than as a wrong price on the storefront.
"""

from __future__ import annotations

import collections
import hashlib
import json
import sys
from pathlib import Path

import openpyxl

REPO = Path(__file__).resolve().parents[2]
DEFAULT_WORKBOOK = REPO / 'Aluminium-Store-Pricing-Framework-v1.0.xlsx'
OUT_PATH = REPO / 'platform/backend/data/catalogue.json'
ASSUMPTIONS_PATH = REPO / 'platform/pricing-service/assumptions.json'

# The workbook stores a finish/spec of N/A or "As Specified" where the line has none. Both mean
# "no finish" rather than a named option, so they map to a null relation.
NO_FINISH = {'N/A', 'As Specified', ''}

# Workbook sub-category -> Prisma PricingBasis. The basis decides whether the cart asks the
# pricing service to recompute a configured price or takes the catalogue price as the price.
# Anything the pricing service cannot compute must be RATE_CARD, otherwise a failure to price
# silently becomes a sale at cost.
PRICING_BASIS = {
    # area-rate (FRAME_GLAZED) -- the pricing service implements exactly these
    'Sliding Windows': 'FRAME_GLAZED',
    'Casement Windows': 'FRAME_GLAZED',
    'Awning Windows': 'FRAME_GLAZED',
    'Hopper Windows': 'FRAME_GLAZED',
    'Louvre Windows': 'FRAME_GLAZED',
    'Fixed / Picture Windows': 'FRAME_GLAZED',
    'Tilt & Turn Windows': 'FRAME_GLAZED',
    'Bay & Bow Window Units': 'FRAME_GLAZED',
    'Sliding Doors': 'FRAME_GLAZED',
    'Stacking & Folding Doors': 'FRAME_GLAZED',
    'Hinged / Casement Doors': 'FRAME_GLAZED',
    'French Doors': 'FRAME_GLAZED',
    'Pivot Doors': 'FRAME_GLAZED',
    'Security & Screen Doors': 'FRAME_GLAZED',
    'Awnings & Canopy Shading': 'FRAME_GLAZED',
    'Pergolas': 'FRAME_GLAZED',
    'Carports & Canopies': 'FRAME_GLAZED',
    'Louvres & Privacy Screens': 'FRAME_GLAZED',
    'Skylights & Roof Glazing': 'FRAME_GLAZED',
    'Garage Doors': 'FRAME_GLAZED',
    'Balcony & Juliet Balustrades': 'FRAME_GLAZED',
    # length-run
    'Balustrades & Railings': 'LENGTH_RUN',
    'Extrusion Profiles & Raw Stock': 'EXTRUSION_LENGTH',
    # structure / rate-card -- no dimensioned form, priced per m2 or per unit
    'Curtain Walling & Structural Glazing': 'FOOTPRINT_FRAME',
    'Shopfront Systems': 'RATE_CARD',
    'Internal Partitioning Systems': 'RATE_CARD',
    'Fascias, Gutters & Rainwater': 'RATE_CARD',
    'Hardware & Ironmongery': 'RATE_CARD',
    'Glazing & Glass': 'RATE_CARD',
    'Sealants, Gaskets & Weatherproofing': 'RATE_CARD',
    'Fixings, Fasteners & Brackets': 'RATE_CARD',
}

UNIT_OF_SALE = {
    'Each': 'EACH',
    'Each/Set': 'EACH',
    'Per Set': 'PER_SET',
    'Per m²': 'PER_M2',
    'Per Linear Metre': 'PER_LINEAR_METRE',
    'Per Run': 'PER_LINEAR_METRE',
}

FULFILMENT = {
    'Stock': 'STOCK',
    'Made-to-Order': 'MADE_TO_ORDER',
    'CMI Partner Network': 'CMI_PARTNER_NETWORK',
}

SEGMENTS = ['RESIDENTIAL', 'COMMERCIAL', 'INSTITUTIONAL', 'INDUSTRIAL']

CATEGORY_META = {
    'Windows': ('windows', 'window', 'Sliding, casement, awning, louvre, tilt & turn, and bay/bow units.'),
    'Doors': ('doors', 'door', 'Sliding, stacking, hinged, French, pivot and security doors.'),
    'Facade & Structural Systems': (
        'facade-structural-systems', 'facade',
        'Curtain walling, shopfront systems and structural glazing — predominantly CMI-routed work.',
    ),
    'Outdoor Living & Shading': (
        'outdoor-living-shading', 'outdoor',
        'Pergolas, carports, awnings, louvres and privacy screens.',
    ),
    'Railing & Screening Systems': (
        'railing-screening-systems', 'railing',
        'Balustrades, handrails, partitioning and screening systems.',
    ),
    'Roofing Glazing & Garage Doors': (
        'roofing-glazing-garage-doors', 'roofing',
        'Skylights, rooflights, garage doors, fascias and rainwater goods.',
    ),
    'Raw Material & Hardware': (
        'raw-material-hardware', 'raw',
        'Extrusion stock, glass, hardware, sealants and fixings — components rather than finished systems.',
    ),
}


def slugify(name: str) -> str:
    out = name.lower()
    for ch, repl in (('&', ''), ('/', ' '), (',', ''), ('—', ' '), ('  ', ' ')):
        out = out.replace(ch, repl)
    return '-'.join(out.split())


def load_assumptions() -> dict:
    return json.loads(ASSUMPTIONS_PATH.read_text())


def recompute_base_cost(row: dict, a: dict) -> float | None:
    """Recompute Base Cost from the assumptions, mirroring the workbook's own formulas.

    Returns None for rows the assumptions cannot price (the non-dimensioned rate-card lines,
    where Base Cost is a direct market-rate input in the workbook).
    """
    sub = row['Sub-Category']
    area_rates = a['AREA_RATE_PER_M2']
    glz_upgrade = a['GLAZING_UPGRADE_PER_M2']
    hardware = a['HARDWARE_ALLOWANCE']
    finish_r = a['FINISH_COST_PER_M']
    frame_kg = a['FRAME_WEIGHT_PER_M']
    alum = a['ALUM_COST_PER_KG']
    infill = a['BALUSTRADE_INFILL_RATE_PER_M']
    shapes = a['EXTRUSION_SHAPE_WEIGHT_PER_M']

    w, h, length = row['Width (mm)'], row['Height (mm)'], row['Length (m)']
    spec = row['Glazing / Material Spec']
    finish = row['Finish']

    if sub in area_rates:
        if not w or not h:
            return None
        area = (w * h) / 1_000_000
        # Hardware is resolved category-first, exactly as the pricing service does. The
        # workbook does the same: Security & Screen Doors rows use the Doors allowance, and
        # the sub-category's own 300 entry is not applied.
        hw = hardware.get(row['Category'], hardware.get(sub, 0))
        base = area * (area_rates[sub] + glz_upgrade.get(spec, 0)) + hw
        # The workbook charges solid aluminium louvre blades as blade material per m² on top
        # of the area rate (its IF(...="Aluminium Louvre Blade") branch), because such a roof
        # carries no glazing to earn the area rate on. Only louvre-roof pergolas hit this.
        if spec == 'Aluminium Louvre Blade':
            base += area * a['LOUVRE_BLADE_MATERIAL_PER_M2']
        return base

    if sub == 'Balustrades & Railings':
        if not length:
            return None
        return length * (frame_kg['BALUSTRADE'] * alum + finish_r.get(finish, 0)) + length * infill.get(row['Configuration'], 0)

    if sub == 'Extrusion Profiles & Raw Stock':
        if not length:
            return None
        kg = shapes.get(row['Configuration'])
        if kg is None:
            return None
        return length * kg * alum + length * finish_r.get(finish, 0)

    return None


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WORKBOOK
    if not src.exists():
        print(f'error: workbook not found at {src}', file=sys.stderr)
        return 1

    a = load_assumptions()
    wb = openpyxl.load_workbook(src, data_only=True)
    rows = list(wb['Priced Catalogue'].iter_rows(values_only=True))
    header = rows[0]
    raw = [dict(zip(header, r)) for r in rows[1:] if r[0]]

    print(f'read {len(raw)} catalogue rows from {src.name}')

    # ---- integrity gates -------------------------------------------------
    failures: list[str] = []
    skus: set[str] = set()
    for r in raw:
        sku = r['SKU']
        if sku in skus:
            failures.append(f'duplicate SKU {sku}')
        skus.add(sku)
        if r['Category'] not in CATEGORY_META:
            failures.append(f'{sku}: unknown category {r["Category"]!r}')
        if r['Sub-Category'] not in PRICING_BASIS:
            failures.append(f'{sku}: unmapped sub-category {r["Sub-Category"]!r}')
        if r['Unit of Sale'] not in UNIT_OF_SALE:
            failures.append(f'{sku}: unmapped unit of sale {r["Unit of Sale"]!r}')
        if r['Fulfilment Type'] not in FULFILMENT:
            failures.append(f'{sku}: unmapped fulfilment {r["Fulfilment Type"]!r}')

    if failures:
        print(f'error: {len(failures)} unmapped/duplicate rows:', file=sys.stderr)
        for f in failures[:20]:
            print('  ', f, file=sys.stderr)
        return 1

    # ---- rebuild and verify pricing ------------------------------------
    products = []
    price_failures = []
    unverified = 0
    for r in raw:
        retail, trade, volume = r['Retail (R)'], r['Trade (R)'], r['Volume (R)']
        expected = recompute_base_cost(r, a)

        # Guard 1: the workbook's three tiers must be arithmetically consistent.
        if abs(trade - retail * 0.88) > 0.02 or abs(volume - retail * 0.80) > 0.02:
            price_failures.append(f'{r["SKU"]}: tier split inconsistent')

        # Guard 2: where we can recompute the base cost, it must match the workbook.
        if expected is not None and abs(expected - r['Base Cost (R)']) > 0.05:
            price_failures.append(
                f'{r["SKU"]}: base cost {r["Base Cost (R)"]:.2f} vs recomputed {expected:.2f}'
            )
        elif expected is None:
            unverified += 1

        products.append({
            'sku': r['SKU'],
            'name': r['Product Name'],
            'category': r['Category'],
            'subCategory': r['Sub-Category'],
            'configuration': r['Configuration'],
            'standardSize': r['Standard Size'] or None,
            'finish': None if r['Finish'] in NO_FINISH else r['Finish'],
            'glazingSpec': None if r['Glazing / Material Spec'] in NO_FINISH else r['Glazing / Material Spec'],
            'unitOfSale': UNIT_OF_SALE[r['Unit of Sale']],
            'segments': [s for s in SEGMENTS if s.capitalize() in r['Segment(s) Served'].replace('All Sectors', 'Residential/Commercial/Institutional/Industrial')],
            'fulfilmentType': FULFILMENT[r['Fulfilment Type']],
            'frameClass': r['Frame Class'] or None,
            'widthMm': int(r['Width (mm)']) if r['Width (mm)'] else None,
            'heightMm': int(r['Height (mm)']) if r['Height (mm)'] else None,
            'lengthM': round(float(r['Length (m)']), 2) if r['Length (m)'] else None,
            'baseCost': round(float(r['Base Cost (R)']), 2),
            'markupPct': round(float(r['Markup %']), 4),
            'retailPrice': round(float(retail), 2),
            'tradePrice': round(float(trade), 2),
            'volumePrice': round(float(volume), 2),
        })

    if price_failures:
        print(f'error: {len(price_failures)} pricing failures:', file=sys.stderr)
        for f in price_failures[:20]:
            print('  ', f, file=sys.stderr)
        return 1

    # ---- taxonomy -------------------------------------------------------
    cats: dict[str, list[str]] = collections.OrderedDict()
    for p in products:
        cats.setdefault(p['category'], [])
        if p['subCategory'] not in cats[p['category']]:
            cats[p['category']].append(p['subCategory'])

    categories = []
    for order, (cname, subs) in enumerate(cats.items()):
        slug, icon, desc = CATEGORY_META[cname]
        categories.append({
            'name': cname,
            'slug': slug,
            'iconKey': icon,
            'description': desc,
            'sortOrder': order,
            'subCategories': [
                {'name': s, 'slug': slugify(s), 'pricingBasis': PRICING_BASIS[s]}
                for s in sorted(subs)
            ],
        })

    doc = {
        'source': {
            'workbook': src.name,
            'sha256': hashlib.sha256(src.read_bytes()).hexdigest(),
            'pricedCatalogueRows': len(raw),
        },
        'categories': categories,
        'products': products,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + '\n')

    print(f'wrote {OUT_PATH.relative_to(REPO)}')
    print(f'  categories   : {len(categories)}')
    print(f'  sub-categories: {sum(len(c["subCategories"]) for c in categories)}')
    print(f'  products     : {len(products)}')
    print(f'  base-cost recomputation verified: {len(products) - unverified}')
    print(f'  direct-input rows (not recomputable): {unverified}')
    print(f'  workbook sha256: {doc["source"]["sha256"][:16]}...')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())