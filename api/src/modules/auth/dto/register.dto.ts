import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password (min 6 characters)',
    example: 'securepassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(100)
  password: string;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(100)
  name: string;
}
