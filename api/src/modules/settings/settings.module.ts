import { Module } from '@nestjs/common';
import { SettingsController, PricingSettingsController, LandingController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, PricingSettingsController, LandingController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
