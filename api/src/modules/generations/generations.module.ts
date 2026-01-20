import { Module } from '@nestjs/common';
import { GenerationsController, GenerateController } from './generations.controller';
import { GenerationsService } from './generations.service';

@Module({
  controllers: [GenerationsController, GenerateController],
  providers: [GenerationsService],
  exports: [GenerationsService],
})
export class GenerationsModule {}
