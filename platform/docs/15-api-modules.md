# API Module Breakdown (NestJS)

| Module | Responsibility |
|---|---|
| `auth` | User auth, session, role guard |
| `catalog` | Category/SubCategory/Product read APIs, search/filter |
| `configurator` | Proxies to the FastAPI pricing microservice, validates size/finish/glazing combinations |
| `cart` | Cart and CartItem CRUD |
| `orders` | Order lifecycle, status transitions |
| `trade-accounts` | Trade account application/approval |
| `quotes` | RFQ lifecycle |
| `cmi-routing` | Partner matching, routing job trigger |
| `compliance-docs` | Compliance document attachment and retrieval |
| `delivery` | Delivery-zone lookup, fee calculation, shipment tracking |
| `payments` | PayFast/Lulapay/PayJustNow integration adapters |
| `admin` | Admin-only aggregation endpoints |

Each module follows the standard NestJS module/controller/service/DTO shape already used on
Roofsteel and Bellwether SWE Plumbers, for consistency across the Group's engineering teams.
