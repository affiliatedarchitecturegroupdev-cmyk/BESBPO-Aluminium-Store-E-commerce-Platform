#!/usr/bin/env bash
#
# Aluminium Store — end-to-end smoke test
# A Specialised Operating Division of Besbpo Group.
#
# Exercises the running API against a real, seeded database. No mocks: every assertion below
# is an HTTP call to a live backend. This exists because the Phase 1 verification was originally
# done with throwaway shell one-liners that vanished with the session — when a change to the
# guards or the checkout transaction regressed, nothing caught it.
#
# Usage:
#   API_BASE=http://localhost:4000/api/v1 bash scripts/smoke.sh
#
# Requires: a seeded database and a running backend. Also expects the pricing service to be
# reachable from the backend (PRICING_SERVICE_URL), since the configurator test calls it.
#
# Exits non-zero on the first failure, so it is safe to gate CI on.

set -uo pipefail

API_BASE="${API_BASE:-http://localhost:4000/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@aluminiumstore.co.za}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-ChangeMe!Admin1}"
TRADE_EMAIL="${TRADE_EMAIL:-buyer@example-trade.co.za}"
TRADE_PASSWORD="${TRADE_PASSWORD:-ChangeMe!Trade1}"

PASS=0
FAIL=0
FAILURES=()

green() { printf '\033[32m%s\033[0m' "$1"; }
red()   { printf '\033[31m%s\033[0m' "$1"; }

# check <description> <expected-status> <actual-status> [body]
check() {
  local desc="$1" want="$2" got="$3" body="${4:-}"
  if [ "$want" = "$got" ]; then
    PASS=$((PASS + 1))
    printf '  %s %s\n' "$(green 'PASS')" "$desc"
  else
    FAIL=$((FAIL + 1))
    printf '  %s %s (want %s, got %s)\n' "$(red 'FAIL')" "$desc" "$want" "$got"
    [ -n "$body" ] && printf '       body: %s\n' "$(printf '%s' "$body" | head -c 300)"
    FAILURES+=("$desc")
  fi
}

# assert_ok <description> <result: 0=ok>
assert_ok() {
  local desc="$1" rc="$2"
  check "$desc" "0" "$rc"
}

# status <method> <path> [token] [json-body] -> prints HTTP status, stashes body in /tmp/smoke_body.json
status() {
  local method="$1" path="$2" token="${3:-}" body="${4:-}"
  local args=(-s -o /tmp/smoke_body.json -w '%{http_code}' -X "$method" "$API_BASE$path" -H 'Content-Type: application/json')
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-d "$body")
  curl "${args[@]}"
}

body() { cat /tmp/smoke_body.json; }

jq_get() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }

# A status is "as expected" when it is one of the acceptable codes. Some endpoints legitimately
# vary (a re-run may hit a 200 where a first run hit a 201), so matching one exact code would
# make the suite flaky against a database that is not reset between runs.
check_one_of() {
  local desc="$1" expected="$2" got="$3" body="${4:-}"
  for want in $expected; do
    if [ "$want" = "$got" ]; then
      PASS=$((PASS + 1))
      printf '  %s %s (%s)\n' "$(green 'PASS')" "$desc" "$got"
      return
    fi
  done
  FAIL=$((FAIL + 1))
  printf '  %s %s (want one of [%s], got %s)\n' "$(red 'FAIL')" "$desc" "$expected" "$got"
  [ -n "$body" ] && printf '       body: %s\n' "$(printf '%s' "$body" | head -c 300)"
  FAILURES+=("$desc")
}

echo "=== Aluminium Store smoke test ==="
echo "API: $API_BASE"
echo

# ---------------------------------------------------------------- health
echo "health"
S=$(status GET /health)
check "GET /health returns 200" 200 "$S" "$(body)"
DB=$(body | jq_get "['database']")
check "health reports database ok" "ok" "$DB"

# ---------------------------------------------------------------- auth
echo "auth"
S=$(status POST /auth/login "" "{\"email\":\"$TRADE_EMAIL\",\"password\":\"$TRADE_PASSWORD\"}")
check_one_of "trade login succeeds" "200 201" "$S" "$(body)"
TRADE_TOKEN=$(body | jq_get "['accessToken']")
assert_ok "trade login returns an access token" "$([ ${#TRADE_TOKEN} -gt 100 ] && echo 0 || echo 1)"

S=$(status POST /auth/login "" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
check_one_of "admin login succeeds" "200 201" "$S" "$(body)"
ADMIN_TOKEN=$(body | jq_get "['accessToken']")
assert_ok "admin login returns an access token" "$([ ${#ADMIN_TOKEN} -gt 100 ] && echo 0 || echo 1)"

S=$(status POST /auth/login "" "{\"email\":\"$TRADE_EMAIL\",\"password\":\"WrongPassword1\"}")
check "wrong password is rejected with 401" 401 "$S"

S=$(status POST /auth/login "" '{"email":"not-an-email","password":"Short"}')
check "malformed login body is rejected with 400" 400 "$S"

# ---------------------------------------------------------------- guards
echo "guards"
S=$(status GET /admin/dashboard)
check "admin endpoint without a token returns 401" 401 "$S"

S=$(status GET /admin/dashboard "$ADMIN_TOKEN")
check "admin endpoint with an admin token returns 200" 200 "$S"

S=$(status GET /admin/dashboard "$TRADE_TOKEN")
check "admin endpoint with a trade token returns 403" 403 "$S"

S=$(status GET /business-desk/team "$TRADE_TOKEN")
check "business-desk/team with company OWNER returns 200" 200 "$S"

S=$(status GET /business-desk/team)
check "business-desk/team without a token returns 401" 401 "$S"

# ---------------------------------------------------------------- catalog
echo "catalog"
S=$(status GET "/catalog/products?take=1")
check "catalogue product list returns 200" 200 "$S"
PRODUCT_ID=$(body | jq_get "['items'][0]['id']")
PRODUCT_SKU=$(body | jq_get "['items'][0]['sku']")
SUB_ID=$(body | jq_get "['items'][0]['subCategoryId']")
PRODUCT_BASE=$(body | jq_get "['items'][0]['baseCost']")
PRODUCT_TRADE=$(body | jq_get "['items'][0]['tradePrice']")
assert_ok "catalogue returns at least one product" "$([ -n "$PRODUCT_ID" ] && [ "$PRODUCT_ID" != "None" ] && echo 0 || echo 1)"

S=$(status GET "/catalog/by-sku/$PRODUCT_SKU")
check "lookup by SKU returns 200" 200 "$S"

S=$(status GET /catalog/categories)
check "categories return 200" 200 "$S"

S=$(status GET /catalog/products/does-not-exist-000)
check "unknown product id returns 404" 404 "$S"

status GET /catalog/finishes >/dev/null
FINISH_ID=$(body | jq_get "[0]['id']")
status GET /catalog/glazing-packages >/dev/null
GLAZING_ID=$(body | jq_get "[0]['id']")

# ---------------------------------------------------------------- configurator
echo "configurator"
S=$(status POST /configurator/price "$TRADE_TOKEN" \
  "{\"productId\":\"$PRODUCT_ID\",\"widthMm\":1800,\"heightMm\":1200,\"finishId\":\"$FINISH_ID\",\"glazingPackageId\":\"$GLAZING_ID\",\"discountTier\":\"TRADE\"}")
check_one_of "configurator prices a configuration" "200 201" "$S" "$(body)"
# The price must come back with the full tier set. A bare number here would mean the pricing
# service was never reached and something fallback-shaped is being returned instead.
assert_ok "price payload carries baseCost/markup/retail/trade/volume" \
  "$(python3 -c "import json;d=json.load(open('/tmp/smoke_body.json'));print(0 if all(k in d for k in ('baseCost','markupPct','retail','trade','volume')) else 1)" 2>/dev/null || echo 1)"

S=$(status POST /configurator/price "$TRADE_TOKEN" '{"productId":"x"}')
check "configurator rejects an incomplete body with 400" 400 "$S"

# ---------------------------------------------------------------- catalogue writes (admin only)
echo "catalogue writes"
S=$(status POST /catalog "$TRADE_TOKEN" '{"sku":"ALS-SMOKE-0001","name":"x"}')
check "trade role cannot create a product (403)" 403 "$S"

S=$(status POST /catalog "$ADMIN_TOKEN" '{"sku":"ALS-SMOKE-0001"}')
check "incomplete product body is rejected with 400" 400 "$S" "$(body)"

# A product must carry a retail price, not just a base cost. Posting cost-only is the shape that
# produced the cost-as-price defect, so it must be rejected rather than defaulted.
S=$(status POST /catalog "$ADMIN_TOKEN" \
  "{\"sku\":\"ALS-SMOKE-NOPRICE\",\"name\":\"Cost only\",\"subCategoryId\":\"$SUB_ID\",\"configuration\":\"c\",\"unitOfSale\":\"EACH\",\"fulfilmentType\":\"STOCK\",\"baseCost\":100.0}")
check "product without a retail price is rejected with 400" 400 "$S" "$(body)"

# Fully-formed body, so the duplicate is rejected because the SKU exists and not because some
# other field is missing.
DUP_BODY="{\"sku\":\"$PRODUCT_SKU\",\"name\":\"Dup\",\"subCategoryId\":\"$SUB_ID\",\"configuration\":\"c\",\"unitOfSale\":\"EACH\",\"fulfilmentType\":\"STOCK\",\"baseCost\":1.0,\"markupPct\":0.42,\"retailPrice\":1.42,\"tradePrice\":1.25,\"volumePrice\":1.14}"
S=$(status POST /catalog "$ADMIN_TOKEN" "$DUP_BODY")
check_one_of "duplicate SKU is rejected with 409" "409" "$S" "$(body)"

S=$(status POST /catalog "$ADMIN_TOKEN" \
  "{\"sku\":\"ALS-SMOKE-BADENUM\",\"name\":\"Bad\",\"subCategoryId\":\"$SUB_ID\",\"configuration\":\"c\",\"unitOfSale\":\"NOT_A_UNIT\",\"fulfilmentType\":\"STOCK\",\"baseCost\":1.0,\"markupPct\":0.42,\"retailPrice\":1.42,\"tradePrice\":1.25,\"volumePrice\":1.14}")
check "invalid enum value is rejected with 400" 400 "$S"

# ---------------------------------------------------------------- pricing integrity
echo "pricing integrity"
# The storefront must never render the wholesale cost as a customer price, and the cart must never
# sell at it. Both held before this suite existed: the listing pages formatted baseCost, and the
# cart used baseCost for every sub-category the pricing service could not compute. Assert the
# relationship directly, so a regression fails here rather than in production.
S=$(status GET "/catalog/products?take=120")
assert_ok "catalogue prices are positive and above cost on every row" \
  "$(python3 -c "
import json
d=json.load(open('/tmp/smoke_body.json'))
bad=[p['sku'] for p in d['items']
     if not (float(p['retailPrice'])>0 and float(p['retailPrice'])>float(p['baseCost'])
             and float(p['tradePrice'])>float(p['baseCost'])
             and float(p['volumePrice'])>float(p['baseCost']))]
print(1 if bad else 0)
" 2>/dev/null || echo 1)"

# Trade is 88% of retail and volume 80%, per the Pricing Framework workbook.
assert_ok "trade/volume tiers keep the workbook's 0.88/0.80 relationship to retail" \
  "$(python3 -c "
import json
d=json.load(open('/tmp/smoke_body.json'))
bad=[p['sku'] for p in d['items']
     if abs(float(p['tradePrice'])-float(p['retailPrice'])*0.88)>0.02
     or abs(float(p['volumePrice'])-float(p['retailPrice'])*0.80)>0.02]
print(1 if bad else 0)
" 2>/dev/null || echo 1)"

# Sorting must order by what the shopper pays, not by our cost.
S=$(status GET "/catalog/products?sort=price-asc&take=20")
assert_ok "price-ascending sorts by retail price" \
  "$(python3 -c "
import json
v=[float(p['retailPrice']) for p in json.load(open('/tmp/smoke_body.json'))['items']]
print(0 if v==sorted(v) else 1)
" 2>/dev/null || echo 1)"

# ---------------------------------------------------------------- cart
echo "cart"
S=$(status DELETE /cart/items/does-not-exist "$TRADE_TOKEN")
check "deleting an unknown cart line returns 404 (not 500)" 404 "$S"

S=$(status POST /cart/items "$TRADE_TOKEN" "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}")
check_one_of "add to cart succeeds" "200 201" "$S" "$(body)"
CART_ITEM_ID=$(body | jq_get "['id']")

# The added line must be priced at the trade tier, not at cost. A trade buyer pays 88% of retail,
# which is still strictly above baseCost; anything at or below baseCost is a sale at cost.
assert_ok "trade cart line is priced above cost, not at it" \
  "$(python3 -c "
import json
d=json.load(open('/tmp/smoke_body.json'))
print(0 if float(d['unitPrice']) > $PRODUCT_BASE else 1)
" 2>/dev/null || echo 1)"

# The same line priced at the catalogue's trade tier. This is the assertion that would have
# failed on every rate-card, extrusion-length and length-run item before the cart was fixed,
# because those never reached the pricing service and fell back to baseCost.
assert_ok "trade cart line equals the catalogue trade price" \
  "$(python3 -c "
import json
d=json.load(open('/tmp/smoke_body.json'))
print(0 if abs(float(d['unitPrice']) - $PRODUCT_TRADE) < 0.01 else 1)
" 2>/dev/null || echo 1)"

S=$(status GET /cart "$TRADE_TOKEN")
check "read cart returns 200" 200 "$S"

S=$(status PATCH "/cart/items/$CART_ITEM_ID" "$TRADE_TOKEN" '{"quantity":2}')
check_one_of "update cart line succeeds" "200" "$S" "$(body)"

# ---------------------------------------------------------------- checkout, incl. double-submit
echo "checkout"
# One cart, submitted concurrently. The cart is consumed inside the checkout transaction, so
# exactly one request may win; the losers must be rejected as conflicts rather than each
# shipping a separate order from the same basket.
curl -s -o /dev/null -X POST "$API_BASE/cart/items" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TRADE_TOKEN" -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}" >/dev/null

orders_before() { status GET /orders/mine "$TRADE_TOKEN" >/dev/null; python3 -c "import json;print(len(json.load(open('/tmp/smoke_body.json'))))" 2>/dev/null || echo 0; }
BEFORE=$(orders_before)

for i in 1 2 3 4 5; do
  status POST /orders/checkout "$TRADE_TOKEN" '{"paymentMethod":"EFT","deliveryProvince":"GAUTENG"}' > "/tmp/smoke_checkout_$i" &
done
wait

AFTER=$(orders_before)

WON=0; CONFLICT=0; OTHER=0
for i in 1 2 3 4 5; do
  case "$(cat "/tmp/smoke_checkout_$i")" in
    201|200) WON=$((WON + 1)) ;;
    409)     CONFLICT=$((CONFLICT + 1)) ;;
    *)       OTHER=$((OTHER + 1)) ;;
  esac
done
echo "  (5 concurrent checkouts: $WON created, $CONFLICT conflicted, $OTHER other)"
check "exactly one concurrent checkout created an order" 1 "$WON"
assert_ok "order count grew by exactly one" "$([ $((AFTER - BEFORE)) -eq 1 ] && echo 0 || echo 1)"

S=$(status POST /orders/checkout "$TRADE_TOKEN" '{"paymentMethod":"NOT_A_METHOD"}')
check "checkout with an invalid payment method returns 400" 400 "$S"

S=$(status POST /orders/checkout "$TRADE_TOKEN" '{"paymentMethod":"EFT","deliveryProvince":"NOT_A_PROVINCE"}')
check "checkout with an invalid province returns 400 (not 500)" 400 "$S" "$(body)"

# Free State and Northern Cape were the two provinces missing from the Phase 1 migration. A 500
# here is exactly the production failure this guards against; 201 (accepted) or 400 (clean
# rejection, e.g. empty cart) are both fine, a 5xx is not.
S=$(status POST /orders/checkout "$TRADE_TOKEN" '{"paymentMethod":"EFT","deliveryProvince":"FREE_STATE"}')
check_one_of "Free State province is handled without a 500" "200 201 400" "$S" "$(body)"

S=$(status POST /orders/checkout "$TRADE_TOKEN" '{"paymentMethod":"EFT","deliveryProvince":"NORTHERN_CAPE"}')
check_one_of "Northern Cape province is handled without a 500" "200 201 400" "$S" "$(body)"

# ---------------------------------------------------------------- newsletter
echo "newsletter"
S=$(status POST /newsletter/subscribe "" '{"email":"smoke-test@example.co.za"}')
check_one_of "newsletter subscribe succeeds" "200 201" "$S" "$(body)"

S=$(status POST /newsletter/unsubscribe "" '{"email":"someone@example.co.za"}')
check_one_of "unsubscribe without a signed token is rejected" "400 401 403" "$S" "$(body)"

# ---------------------------------------------------------------- CMI routing + misc
echo "cmi-routing and misc"
S=$(status GET /cmi-routing/partners)
check "CMI partner list returns 200" 200 "$S"

S=$(status GET /compliance-docs)
check "compliance documents return 200" 200 "$S"

S=$(status POST /delivery/quote "" '{"province":"GAUTENG","weightKg":50,"isFragile":true}')
check_one_of "delivery quote returns a fee payload" "200 201" "$S" "$(body)"
assert_ok "delivery quote returns a numeric total" \
  "$(python3 -c "import json;d=json.load(open('/tmp/smoke_body.json'));print(0 if isinstance(d.get('total'),(int,float)) else 1)" 2>/dev/null || echo 1)"

S=$(status POST /delivery/quote "" '{"province":"NOT_A_PROVINCE","weightKg":50,"isFragile":false}')
check "delivery quote rejects an invalid province with 400" 400 "$S"

S=$(status POST /delivery/quote "" '{"province":"FREE_STATE","weightKg":50,"isFragile":false}')
check_one_of "delivery quote handles Free State (no 500)" "200 201" "$S" "$(body)"

S=$(status GET /trade-accounts)
check "trade-account listing requires auth (401)" 401 "$S"

S=$(status GET /admin/trade-accounts/pending "$TRADE_TOKEN")
check "pending trade accounts require ADMIN (403 for trade)" 403 "$S"

# ---------------------------------------------------------------- summary
echo
echo "=== $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  echo "Failures:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
echo "All smoke checks passed."