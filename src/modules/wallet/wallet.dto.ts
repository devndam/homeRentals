import { IsNumber, IsOptional, IsString, Min, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, WithdrawalStatus } from '../../types';

export class TransactionFilterDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

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

export class RequestWithdrawalDto {
  @IsNumber()
  @Min(1000, { message: 'Minimum withdrawal amount is ₦1,000' })
  @Type(() => Number)
  amount!: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class RejectWithdrawalDto {
  @IsString()
  reason!: string;
}
