# Delivery Addresses

## Purpose

The buyer's address book. Owns street-level delivery detail so that an order records where the
aluminium is actually going, not just which province to price delivery against.

## Ownership is the whole point

An address belongs to exactly one user. Every read and every write goes through
`AddressesService.findOwned(userId, id)`, which queries on `{ id, userId }` — never `id` alone:

```ts
const address = await this.prisma.address.findFirst({ where: { id, userId } });
if (!address) throw new NotFoundException(`Address ${id} not found`);
```

This is the gate that stops a caller reaching another account's address by guessing a cuid
(the IDOR class of bug). It answers **404, not 403**: a 403 would confirm that the id exists,
which is itself information the caller should not have. `list`, `create`, `update` and `remove`
all pass through it, and the checkout path in `orders.service.ts` calls it too before attaching
an address to an order.

The spec (`addresses.service.spec.ts`) asserts the query shape — that `where` carries `userId` —
because a future refactor that drops the `userId` filter would still pass a behavioural test
while silently reopening the hole.

## Route surface

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/addresses` | Bearer | The caller's own addresses, default first |
| `POST` | `/addresses` | Bearer | Creates; `userId` comes from the token, never the body |
| `PATCH` | `/addresses/:id` | Bearer | Partial update, ownership-checked |
| `DELETE` | `/addresses/:id` | Bearer | Ownership-checked; promotes a survivor if the default was removed |

There is no `GET /addresses/:id`. Checkout reads the list and selects from it; a single-address
read would add a route with no consumer.

## Default-address invariant

**At most one default per user.** Enforced in a transaction by demoting before promoting:

1. The first address a buyer saves becomes their default automatically — otherwise checkout has
   to guess, and a new buyer with one address would find none preselected.
2. When an address is made default, the incumbent is demoted *first*, so there is never a moment
   with two defaults.
3. Deleting the default promotes the oldest survivor, so an account that still has addresses is
   never left without one.

`checkout/page.tsx` preselects the default (`isDefault`) and falls back to the first address.

## Validation

| Field | Rule | Why |
|---|---|---|
| `line1` | 2–120 chars | Street address |
| `line2` | optional, ≤120 | Suburb / complex / unit |
| `city` | 2–80 chars | |
| `province` | must be one of the nine `PROVINCES` | Delivery zones are province-keyed — a free-text province prices nothing |
| `postalCode` | `/^\d{4}$/` | South African postal codes are exactly four digits; caught here as a 400 rather than failing at the courier days later |
| `isDefault` | optional boolean | |

`UpdateAddressDto` is `PartialType(CreateAddressDto)`, so every rule is inherited and a PATCH
cannot bypass validation by omitting a field.

## Province: one list, both ends

`PROVINCES` exists in two places — `backend/src/common/provinces.ts` (validated by
`provinces.spec.ts`) and `frontend/lib/provinces.ts` — because DTOs must stay free of
`@prisma/client` and the browser cannot import backend source. **They must list all nine.**

This has already drifted once: the checkout form carried a hand-copied array of seven that
dropped Free State and Northern Cape, so a shopper in either was quietly charged Gauteng
delivery. The storefront e2e test asserts the rendered form offers exactly nine options to
catch the next drift.

## Related

- `docs/08-checkout-fulfilment.md` — how the address is used at checkout
- `docs/09-delivery-courier.md` — the province-keyed delivery zones
