import { IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculatePriceDto {
  @ApiProperty({
    description: 'Selected options for the model',
    example: { image_size: 'landscape_16_9', num_images: '2' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  options?: Record<string, string>;
}
