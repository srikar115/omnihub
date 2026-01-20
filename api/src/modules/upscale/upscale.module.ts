import { Module } from '@nestjs/common';
import { UpscaleController } from './upscale.controller';
import { UpscaleService } from './upscale.service';

@Module({
  controllers: [UpscaleController],
  providers: [UpscaleService],
  exports: [UpscaleService],
})
export class UpscaleModule {}
