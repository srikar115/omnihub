import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('google-client-id')
  async getGoogleClientId() {
    return { clientId: await this.settingsService.getGoogleClientId() };
  }

  @Get('razorpay-key')
  async getRazorpayKeyId() {
    return { keyId: await this.settingsService.getRazorpayKeyId() };
  }
}

// Landing page controller
@ApiTags('landing')
@Controller('api/landing')
export class LandingController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('featured')
  async getFeatured() {
    return this.settingsService.getLandingFeatured();
  }
}
