import { IsOptional, IsString, IsNumber, IsArray, IsObject, ValidateNested, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

export class UpdateBankDetailsDto {
  @IsString()
  bankName!: string;

  @IsString()
  bankAccountNumber!: string;

  @IsString()
  bankAccountName!: string;
}

export class UpdatePreferencesDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  budgetMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  budgetMax?: number;

  @IsArray()
  @IsOptional()
  preferredLocations?: string[];

  @IsArray()
  @IsOptional()
  propertyTypes?: string[];
}
