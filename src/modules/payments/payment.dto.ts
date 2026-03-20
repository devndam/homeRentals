import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus, PaymentType } from '../../types';

export class InitiatePaymentDto {
  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @IsUUID()
  @IsOptional()
  invoiceId?: string;

  @IsEnum(PaymentType)
  type!: PaymentType;

  @IsNumber()
  @Type(() => Number)
  amount!: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  reference!: string;
}

export class PaymentFilterDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC';
}
