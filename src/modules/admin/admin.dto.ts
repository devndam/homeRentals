import {
  IsString, IsNotEmpty, IsEmail, IsArray, IsEnum, IsOptional, MinLength, Matches, IsBoolean,
} from 'class-validator';
import { AdminPermission } from '../../types';

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

export class RejectPropertyDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
