import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-microsoft';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor() {
    super({
      clientID: process.env.MICROSOFT_CLIENT_ID as string,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
      callbackURL: process.env.MICROSOFT_CALLBACK_URL ?? '/api/v1/auth/microsoft/callback',
      scope: ['user.read'],
      tenant: 'common', // personal + work/school Microsoft accounts — relevant for Trade buyers on O365
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
