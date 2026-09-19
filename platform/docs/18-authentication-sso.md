# Authentication & Single Sign-On

Six sign-in options, one `User` record per buyer.

## The six options
1. **Email / password** — standard registration, credential storage delegated to Supabase
   Auth in production (the Group-standard identity provider) rather than a bespoke table.
2. **Google**
3. **Facebook**
4. **X** (formerly Twitter)
5. **Apple** (Sign in with Apple)
6. **Microsoft** (personal + work/school accounts — relevant for Trade buyers signing in
   from a company O365 tenant)

## Account linking
`OAuthAccount` is a separate table keyed on `(provider, providerAccountId)`, pointing at a
`User`. On any OAuth callback, `AuthService.findOrCreateOAuthUser()`:
1. Looks for an existing `(provider, providerAccountId)` link — if found, that's the user.
2. Otherwise looks for an existing `User` by email — if found, links the new provider to
   that existing account rather than creating a duplicate.
3. Otherwise creates a new `User` plus the first `OAuthAccount` link.

This means a buyer who signs up with Google and comes back later via Microsoft on the same
work email lands in one account, with full order history intact — not two accounts.

## Provider-specific notes worth knowing before Phase 1 build-out
- **X (Twitter)** does not reliably return a verified email via its OAuth 2.0 API. The `x.strategy.ts`
  stub flags this with a placeholder email and a comment — buyers signing in via X need an
  in-app prompt to confirm/add a real email before checkout (compliance documents and order
  confirmations are emailed).
- **Apple** only returns the buyer's name on their very first-ever authorization with this
  app — the frontend must capture it then, since it will not come back on subsequent logins.
- **Apple's callback is a POST**, not the GET redirect the other four providers use
  (`response_mode=form_post`) — already reflected in the controller's route method.

## Where sign-in buttons appear
The `/login` and `/register` routes render all six options as equal-weight buttons (Email
as a form, the five OAuth providers as branded buttons) — no provider is defaulted or
pre-selected, consistent with not steering buyers toward one identity provider over another.

## Business Desk team invites
Team members invited via the Business Desk (`docs/20-business-desk.md`) are created as
placeholder `User` records against a company; they complete their own sign-in — via any of
the six options — on first login, which links their chosen provider to the invited record.
