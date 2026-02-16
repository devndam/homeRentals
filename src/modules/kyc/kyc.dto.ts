import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { KycDocumentType, KycStatus } from '../../types';

export class SubmitKycDto {
  @IsEnum(KycDocumentType, { message: 'documentType must be one of: national_id, international_passport, drivers_license, voters_card' })
  @IsNotEmpty()
  documentType!: KycDocumentType;
}

export class KycListQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(KycStatus)
  status?: KycStatus;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC';
}

export class RejectKycDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
