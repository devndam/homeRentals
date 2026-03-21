import { IsString, IsOptional, IsArray, IsEnum, IsEmail, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { OrgPermission } from '../../types';

export class CreateOrganisationDto {
  @IsString()
  name!: string;
}

export class UpdateOrganisationDto {
  @IsOptional()
  @IsString()
  name?: string;
}

export class InviteStaffDto {
  @IsEmail()
  email!: string;

  @IsArray()
  @IsEnum(OrgPermission, { each: true })
  permissions!: OrgPermission[];
}

export class UpdateMemberPermissionsDto {
  @IsArray()
  @IsEnum(OrgPermission, { each: true })
  permissions!: OrgPermission[];
}
