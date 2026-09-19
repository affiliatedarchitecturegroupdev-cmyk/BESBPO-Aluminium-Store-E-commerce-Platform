import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Shape Passport gives us back from any of the 5 OAuth strategies —
// normalised in each strategy's validate() so this service never branches on provider shape.
export type OAuthProfile = {
  providerAccountId: string;
  email: string;
  name: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ---- Email/password ----

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: 'RETAIL',
        passwordHash,
        authProviders: { create: { provider: 'EMAIL', providerAccountId: dto.email } },
      },
    });
    // Credential storage: the hash above is real and verified in login(). In production the
    // Group standard is to delegate credential storage to Supabase Auth — swap login()/
    // register() for the Supabase Auth client when that integration lands (docs/18-authentication-sso.md).
    return this.issueToken(user.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // A user whose only sign-in option is OAuth has no passwordHash — reject rather than
    // letting an empty/undefined hash comparison succeed.
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');
    return this.issueToken(user.id, user.role);
  }

  // ---- OAuth (Google / Facebook / X / Apple / Microsoft) ----

  // Finds an existing user by (provider, providerAccountId) first, then falls back to
  // matching by email so a buyer who signs up with Google and later tries Microsoft on
  // the same email address gets linked to one account, not a duplicate.
  async findOrCreateOAuthUser(provider: string, profile: OAuthProfile) {
    const existingLink = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: provider as never, providerAccountId: profile.providerAccountId } },
      include: { user: true },
    });
    if (existingLink) return existingLink.user;

    const existingUser = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (existingUser) {
      await this.prisma.oAuthAccount.create({
        data: { userId: existingUser.id, provider: provider as never, providerAccountId: profile.providerAccountId },
      });
      return existingUser;
    }

    return this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        role: 'RETAIL',
        authProviders: { create: { provider: provider as never, providerAccountId: profile.providerAccountId } },
      },
    });
  }

  async issueTokenForOAuthProfile(provider: string, profile: unknown) {
    const user = await this.findOrCreateOAuthUser(provider, profile as OAuthProfile);
    return this.issueToken(user.id, user.role);
  }

  private issueToken(userId: string, role: string) {
    const accessToken = this.jwt.sign({ sub: userId, role });
    return { accessToken };
  }

  getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: { include: { tradeAccount: true } }, addresses: true, authProviders: true },
    });
  }
}
