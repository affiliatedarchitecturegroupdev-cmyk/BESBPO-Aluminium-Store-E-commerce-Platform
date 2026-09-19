import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

// X (formerly Twitter) moved to OAuth 2.0 with PKCE for its v2 API — there is no actively
// maintained provider-specific Passport package, so this uses the generic passport-oauth2
// strategy pointed at X's authorize/token endpoints, with a manual profile fetch.
@Injectable()
export class XStrategy extends PassportStrategy(Strategy, 'x') {
  constructor() {
    super({
      authorizationURL: 'https://twitter.com/i/oauth2/authorize',
      tokenURL: 'https://api.twitter.com/2/oauth2/token',
      clientID: process.env.X_CLIENT_ID as string,
      clientSecret: process.env.X_CLIENT_SECRET as string,
      callbackURL: process.env.X_CALLBACK_URL ?? '/api/v1/auth/x/callback',
      scope: ['tweet.read', 'users.read'],
      pkce: true,
      state: true,
    });
  }

  async validate(accessToken: string, _refreshToken: string, _params: unknown, done: (err: unknown, user: unknown) => void) {
    try {
      const res = await fetch('https://api.twitter.com/2/users/me?user.fields=name', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const { data } = await res.json();
      done(null, {
        providerAccountId: data.id,
        // X's API does not return a verified email by default — buyers signing in with X
        // are prompted once to confirm/add an email in-app before checkout (see
        // docs/18-authentication-sso.md).
        email: `${data.username}@x.placeholder`,
        name: data.name,
      });
    } catch (err) {
      done(err, null);
    }
  }
}
