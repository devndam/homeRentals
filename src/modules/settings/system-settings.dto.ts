import { IsOptional, IsNumber, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSystemSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  platformCommissionPercent?: number;

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  serviceChargeType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  serviceChargeValue?: number;

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  agentFeeType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  agentFeeValue?: number;

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  legalFeeType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  legalFeeValue?: number;

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  cautionDepositType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cautionDepositValue?: number;
}
