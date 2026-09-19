/**
 * OAuth strategies are optional integrations. Every provider package constructs its strategy
 * eagerly in the constructor and throws if its client credentials are missing — which turns the
 * absence of, say, an Apple key into a failed boot for the whole API. That is the wrong failure
 * mode: on Render (and any fresh environment) credentials are added provider-by-provider, so a
 * provider with no credentials must simply not be registered, not take the platform down.
 *
 * `isConfigured` is checked at the top of each strategy constructor; when it returns false the
 * strategy returns before calling super(), leaving the route present but non-functional until
 * the corresponding secrets are set.
 */
export function oauthStrategyConfigured(keys: string[]): boolean {
  return keys.every((k) => (process.env[k] ?? '').trim().length > 0);
}