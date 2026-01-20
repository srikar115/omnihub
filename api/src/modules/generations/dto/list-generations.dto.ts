import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListGenerationsDto {
  @ApiProperty({
    description: 'Filter by type (image or video)',
    required: false,
    enum: ['image', 'video'],
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Workspace ID to filter by',
    required: false,
  })
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @ApiProperty({
    description: 'Maximum number of results to return',
    required: false,
    default: 50,
    minimum: 1,
    maximum: 1000,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number = 50;

  @ApiProperty({
    description: 'Number of results to skip',
    required: false,
    default: 0,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number = 0;
}
