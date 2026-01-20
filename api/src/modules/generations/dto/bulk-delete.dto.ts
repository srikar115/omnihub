import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteDto {
  @ApiProperty({
    description: 'Array of generation IDs to delete',
    example: ['gen-1', 'gen-2', 'gen-3'],
    minItems: 1,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  ids: string[];
}
