import { Controller, Post, Get, Body, UseGuards, Req, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AUTH_ROUTES, AUTH_ROUTE_DESCRIPTIONS } from './auth.routes';
import { RegisterDto, LoginDto, GoogleAuthDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser, CurrentUserData } from '@common/decorators';

@ApiTags('auth')
@Controller(AUTH_ROUTES.BASE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Extract client info from request
   */
  private getClientInfo(req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket?.remoteAddress;
    return { userAgent, ipAddress };
  }

  @Post(AUTH_ROUTES.REGISTER)
  @ApiOperation({ summary: AUTH_ROUTE_DESCRIPTIONS.REGISTER })
  @ApiResponse({ status: 201, description: 'User successfully registered with access and refresh tokens' })
  @ApiResponse({ status: 400, description: 'Email already registered or invalid data' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const { userAgent, ipAddress } = this.getClientInfo(req);
    return this.authService.register(dto, userAgent, ipAddress);
  }

  @Post(AUTH_ROUTES.LOGIN)
  @ApiOperation({ summary: AUTH_ROUTE_DESCRIPTIONS.LOGIN })
  @ApiResponse({ status: 200, description: 'Login successful with access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const { userAgent, ipAddress } = this.getClientInfo(req);
    return this.authService.login(dto, userAgent, ipAddress);
  }

  @Post(AUTH_ROUTES.GOOGLE)
  @ApiOperation({ summary: AUTH_ROUTE_DESCRIPTIONS.GOOGLE })
  @ApiResponse({ status: 200, description: 'Google authentication successful with access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Google authentication failed' })
  async googleAuth(@Body() dto: GoogleAuthDto, @Req() req: Request) {
    const { userAgent, ipAddress } = this.getClientInfo(req);
    return this.authService.googleAuth(dto, userAgent, ipAddress);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const { userAgent, ipAddress } = this.getClientInfo(req);
    return this.authService.refreshTokens(dto.refreshToken, userAgent, ipAddress);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@CurrentUser() user: CurrentUserData) {
    return this.authService.logoutAll(user.id);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessions(@CurrentUser() user: CurrentUserData) {
    return this.authService.getActiveSessions(user.id);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeSession(
    @CurrentUser() user: CurrentUserData,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(user.id, sessionId);
  }

  @Get(AUTH_ROUTES.ME)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: AUTH_ROUTE_DESCRIPTIONS.ME })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: CurrentUserData) {
    return this.authService.getMe(user.id);
  }
}
