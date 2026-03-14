import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsUUID, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { AgreementStatus } from '../../types';

export class CreateAgreementDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  propertyId!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rentAmount!: number;

  @IsString()
  @IsOptional()
  rentPeriod?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cautionDeposit?: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsString()
  @IsOptional()
  additionalTerms?: string;
}

export class SignAgreementDto {
  @IsString()
  @IsNotEmpty()
  signature!: string; // base64 encoded signature image
}

export class AgreementFilterDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(AgreementStatus)
  status?: AgreementStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC';
}
