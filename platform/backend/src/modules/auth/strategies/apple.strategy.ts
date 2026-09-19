import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';

// Apple posts the callback (response_mode=form_post) rather than a GET redirect —
// the controller route for this one is @Post, not @Get, see auth.controller.ts.
@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor() {
    super({
      clientID: process.env.APPLE_CLIENT_ID as string, // Services ID, e.g. za.co.besbpo.aluminiumstore.web
      teamID: process.env.APPLE_TEAM_ID as string,
      keyID: process.env.APPLE_KEY_ID as string,
      privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH as string,
      callbackURL: process.env.APPLE_CALLBACK_URL ?? '/api/v1/auth/apple/callback',
      scope: ['name', 'email'],
      passReqToCallback: false,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    idTokenPayload: { sub: string; email?: string },
    profile: { name?: { firstName?: string; lastName?: string } },
    done: (err: unknown, user: unknown) => void,
  ) {
    // Apple only returns `name` on the buyer's very first authorization ever — the
    // frontend must capture and pass it through if this is a first-time sign-up.
    const name = profile?.name ? `${profile.name.firstName ?? ''} ${profile.name.lastName ?? ''}`.trim() : 'Apple User';
    done(null, {
      providerAccountId: idTokenPayload.sub,
      email: idTokenPayload.email ?? '',
      name,
    });
  }
}
