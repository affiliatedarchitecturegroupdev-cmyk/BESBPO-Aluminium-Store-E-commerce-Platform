import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---- Email/password (1 of 6) ----
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ---- OAuth (5 of 6): Google, Facebook, X, Apple, Microsoft ----
  // Each provider follows the identical initiate -> provider consent -> callback shape.
  // Passport handles the redirect; the callback exchanges the profile for a JWT and
  // redirects the browser back to the frontend with the token as a query param
  // (frontend immediately stores it and strips the URL — see docs/18-authentication-sso.md).

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google's consent screen; nothing to do here.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken } = await this.authService.issueTokenForOAuthProfile('GOOGLE', req.user);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${accessToken}`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken } = await this.authService.issueTokenForOAuthProfile('FACEBOOK', req.user);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${accessToken}`);
  }

  @Get('x')
  @UseGuards(AuthGuard('x'))
  xAuth() {}

  @Get('x/callback')
  @UseGuards(AuthGuard('x'))
  async xCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken } = await this.authService.issueTokenForOAuthProfile('X', req.user);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${accessToken}`);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  appleAuth() {}

  @Post('apple/callback') // Apple posts the callback (form_post response_mode), not GET
  @UseGuards(AuthGuard('apple'))
  async appleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken } = await this.authService.issueTokenForOAuthProfile('APPLE', req.user);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${accessToken}`);
  }

  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  microsoftAuth() {}

  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken } = await this.authService.issueTokenForOAuthProfile('MICROSOFT', req.user);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${accessToken}`);
  }

  // ---- Session ----
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }
}
