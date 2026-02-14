import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '../../types';

export class InitiatePaymentDto {
  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @IsUUID()
  @IsOptional()
  agreementId?: string;

  @IsEnum(PaymentType)
  type!: PaymentType;

  @IsNumber()
  @Min(100) // Minimum NGN 100
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
