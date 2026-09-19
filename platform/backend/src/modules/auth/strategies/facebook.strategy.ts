import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      clientID: process.env.FACEBOOK_APP_ID as string,
      clientSecret: process.env.FACEBOOK_APP_SECRET as string,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL ?? '/api/v1/auth/facebook/callback',
      profileFields: ['id', 'emails', 'displayName'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: (err: unknown, user: unknown) => void) {
    done(null, {
      providerAccountId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      name: profile.displayName,
    });
  }
}
