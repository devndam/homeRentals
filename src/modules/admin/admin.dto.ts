import {
  IsString, IsNotEmpty, IsEmail, IsArray, IsEnum, IsOptional, MinLength, Matches, IsBoolean,
} from 'class-validator';
import { AdminPermission, UserRole } from '../../types';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Phone must be a valid phone number' })
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsArray()
  @IsEnum(AdminPermission, { each: true, message: 'Each permission must be a valid AdminPermission' })
  permissions!: AdminPermission[];

  @IsBoolean()
  @IsOptional()
  isSuperAdmin?: boolean;
}

export class UpdateAdminPermissionsDto {
  @IsArray()
  @IsEnum(AdminPermission, { each: true, message: 'Each permission must be a valid AdminPermission' })
  permissions!: AdminPermission[];
}

export class UpdateAdminRoleDto {
  @IsBoolean()
  isSuperAdmin!: boolean;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Phone must be a valid phone number' })
  @IsOptional()
  phone?: string;

  @IsEnum(UserRole, { message: 'Role must be a valid UserRole' })
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;

  @IsBoolean()
  @IsOptional()
  identityVerified?: boolean;
}

export class RejectPropertyDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
