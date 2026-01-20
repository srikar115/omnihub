import { IsString, IsOptional, IsNumber, IsEmail, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'Workspace name', example: 'My Team' })
  @IsString()
  name: string;
}

export class UpdateWorkspaceDto {
  @ApiProperty({ description: 'New workspace name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Credit mode', required: false, enum: ['shared', 'individual'] })
  @IsString()
  @IsOptional()
  creditMode?: string;

  @ApiProperty({ description: 'Privacy settings JSON', required: false })
  @IsOptional()
  privacySettings?: Record<string, any>;
}

export class InviteMemberDto {
  @ApiProperty({ description: 'Email address to invite', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Role to assign', enum: ['member', 'admin'], default: 'member' })
  @IsString()
  @IsOptional()
  role?: string;
}

export class UpdateMemberDto {
  @ApiProperty({ description: 'New role for member', enum: ['member', 'admin'] })
  @IsString()
  role: string;
}

export class AddCreditsDto {
  @ApiProperty({ description: 'Amount of credits to add', example: 100 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class AllocateCreditsDto {
  @ApiProperty({ description: 'User ID to allocate credits to' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Amount of credits to allocate', example: 50 })
  @IsNumber()
  @Min(0)
  amount: number;
}
