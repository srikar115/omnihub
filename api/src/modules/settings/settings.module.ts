import { Module } from '@nestjs/common';
import { SettingsController, LandingController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, LandingController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
