import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Populates `req.user` when a valid bearer token is present, but never rejects a request without
 * one.
 *
 * The merchandising reads (recently-viewed, recommended) and the product-view write are public:
 * a guest must be able to use them keyed by an opaque session id. But a signed-in buyer's history
 * should follow their account rather than their browser, which needs `req.user.id` populated.
 * Plain `@UseGuards(JwtAuthGuard)` would 401 every guest; no guard at all leaves `req.user`
 * permanently undefined, so the account path silently never runs.
 *
 * A malformed or expired token is treated as "not signed in" rather than an error, because these
 * endpoints are usable without a token in the first place.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser): TUser | undefined {
    return user || undefined;
  }
}
