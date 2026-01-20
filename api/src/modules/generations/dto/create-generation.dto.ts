import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGenerationDto {
  @ApiProperty({
    description: 'Type of generation (image or video)',
    example: 'image',
    enum: ['image', 'video'],
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Model ID to use for generation',
    example: 'flux-pro-1.1',
  })
  @IsString()
  model: string;

  @ApiProperty({
    description: 'Text prompt for generation',
    example: 'A beautiful sunset over mountains',
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Additional options for the model',
    example: { image_size: 'landscape_16_9' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  options?: Record<string, any>;

  @ApiProperty({
    description: 'Input image URLs for image-to-image generation',
    example: ['https://example.com/image.jpg'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  inputImages?: string[];

  @ApiProperty({
    description: 'Workspace ID to associate the generation with',
    required: false,
  })
  @IsString()
  @IsOptional()
  workspaceId?: string;
}
