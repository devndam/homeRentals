import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class RentFilterDto {
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

export class SignRentAgreementDto {
  @IsString()
  signature!: string;
}
