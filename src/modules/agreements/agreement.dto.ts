import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
