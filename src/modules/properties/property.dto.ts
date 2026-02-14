import {
  IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsBoolean,
  IsArray, Min, IsDateString, IsInt,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PropertyType } from '../../types';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(PropertyType)
  type!: PropertyType;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @IsString()
  @IsOptional()
  pricePeriod?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cautionFee?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  agencyFee?: number;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  bedrooms?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  bathrooms?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  toilets?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  areaSqm?: number;

  @IsArray()
  @IsOptional()
  amenities?: string[];

  @IsArray()
  @IsOptional()
  rules?: string[];

  @IsBoolean()
  @IsOptional()
  isFurnished?: boolean;

  @IsBoolean()
  @IsOptional()
  hasServicing?: boolean;

  @IsBoolean()
  @IsOptional()
  isPetFriendly?: boolean;

  @IsDateString()
  @IsOptional()
  availableFrom?: string;
}

export class UpdatePropertyDto extends CreatePropertyDto {
  // All fields optional for update (inherits decorators with @IsOptional)
}

export class PropertyFilterDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  bathrooms?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFurnished?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPetFriendly?: boolean;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC';
}
