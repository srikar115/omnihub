import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('google-client-id')
  @ApiOperation({ summary: 'Get Google OAuth client ID' })
  async getGoogleClientId() {
    return { clientId: await this.settingsService.getGoogleClientId() };
  }

  @Get('razorpay-key')
  @ApiOperation({ summary: 'Get Razorpay key ID' })
  async getRazorpayKeyId() {
    return { keyId: await this.settingsService.getRazorpayKeyId() };
  }
}

// Public pricing settings controller
@ApiTags('settings')
@Controller('api/pricing-settings')
export class PricingSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get public pricing settings (profit margins, credit price, free credits)' })
  async getPricingSettings() {
    return this.settingsService.getPricingSettings();
  }
}

// Landing page controller
@ApiTags('landing')
@Controller('api/landing')
export class LandingController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('featured')
  @ApiOperation({ summary: 'Get featured content for landing page' })
  async getFeatured() {
    return this.settingsService.getLandingFeatured();
  }
}
