import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AUTH_ROUTES, AUTH_ROUTE_DESCRIPTIONS } from './auth.routes';
import { RegisterDto, LoginDto, GoogleAuthDto } from './dto';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser, CurrentUserData } from '@common/decorators';

@ApiTags('auth')
@Controller(AUTH_ROUTES.BASE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post(AUTH_ROUTES.REGISTER)
  @ApiOperation({ summary: AUTH_ROUTE_DESCRIPTIONS.REGISTER })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Email already registered or invalid data' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post(AUTH_ROUTES.LOGIN)
  @ApiOperation({ summary: AUTH_ROUTE_DESCRIPTIONS.LOGIN })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post(AUTH_ROUTES.GOOGLE)
  @ApiOperation({ summary: AUTH_ROUTE_DESCRIPTIONS.GOOGLE })
  @ApiResponse({ status: 200, description: 'Google authentication successful' })
  @ApiResponse({ status: 401, description: 'Google authentication failed' })
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
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
