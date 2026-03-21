import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestInvoiceDto {
  @IsUUID()
  propertyId!: string;

  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  units?: number;
}

export class CreateInvoiceDto {
  @IsUUID()
  @IsOptional()
  invoiceId?: string;

  @IsUUID()
  tenantId!: string;

  @IsUUID()
  propertyId!: string;

  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rentAmount!: number;

  @IsString()
  @IsOptional()
  rentPeriod?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsString()
  @IsOptional()
  additionalTerms?: string;
}

export class SignInvoiceDto {
  @IsString()
  @IsNotEmpty()
  signature!: string;
}

export class InvoiceFilterDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  status?: string;

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
