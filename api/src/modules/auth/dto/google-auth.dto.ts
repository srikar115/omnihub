import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Google OAuth credential token',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6...',
  })
  @IsString({ message: 'Google credential is required' })
  credential: string;
}
