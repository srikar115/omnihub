import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShareGenerationDto {
  @ApiProperty({
    description: 'Whether to share with workspace',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  sharedWithWorkspace?: boolean;
}
