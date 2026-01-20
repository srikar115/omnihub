import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'Model ID for the conversation', required: false })
  @IsString()
  @IsOptional()
  modelId?: string;

  @ApiProperty({ description: 'Initial title', required: false })
  @IsString()
  @IsOptional()
  title?: string;
}

export class UpdateConversationDto {
  @ApiProperty({ description: 'New title for the conversation' })
  @IsString()
  @IsOptional()
  title?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message content', example: 'Hello, how are you?' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Image URLs to include', required: false })
  @IsArray()
  @IsOptional()
  imageUrls?: string[];

  @ApiProperty({ description: 'Enable web search', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  webSearch?: boolean;
}

export class EstimateCostDto {
  @ApiProperty({ description: 'Model ID' })
  @IsString()
  modelId: string;

  @ApiProperty({ description: 'Input text' })
  @IsString()
  inputText: string;

  @ApiProperty({ description: 'Number of images', required: false, default: 0 })
  @IsOptional()
  imageCount?: number;
}
