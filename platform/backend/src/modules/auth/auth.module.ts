import { Module, Provider } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { XStrategy } from './strategies/x.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { oauthStrategyConfigured } from './strategies/strategy-config';

// Each passport-oauth2 provider package throws from its constructor if its credentials are
// absent, which would abort the whole Nest bootstrap. Credentials are added provider-by-provider
// on the deploy platform, so an unconfigured provider is simply not registered — the platform
// boots with email/password and whichever providers are live (docs/18-authentication-sso.md).
const oauthCandidates: (Provider | null)[] = [
  oauthStrategyConfigured(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) ? GoogleStrategy : null,
  oauthStrategyConfigured(['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET']) ? FacebookStrategy : null,
  oauthStrategyConfigured(['X_CLIENT_ID', 'X_CLIENT_SECRET']) ? XStrategy : null,
  oauthStrategyConfigured(['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY_PATH']) ? AppleStrategy : null,
  oauthStrategyConfigured(['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET']) ? MicrosoftStrategy : null,
];
const oauthProviders = oauthCandidates.filter((p): p is Provider => p !== null);

// Six sign-in options total: Email/password + five OAuth providers.
// Each OAuth strategy resolves to the same AuthService.findOrCreateOAuthUser(),
// so a buyer who signs up with Google and later uses Apple on the same email
// lands in one User record, not two — see docs/18-authentication-sso.md.
@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ...oauthProviders],
  exports: [AuthService],
})
export class AuthModule {}
