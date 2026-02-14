import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '../../types';

export class CreateBookingDto {
  @IsUUID()
  propertyId!: string;

  @IsDateString()
  proposedDate!: string;

  @IsString()
  @IsOptional()
  message?: string;
}

export class RespondBookingDto {
  @IsEnum([BookingStatus.APPROVED, BookingStatus.REJECTED], {
    message: 'Status must be approved or rejected',
  })
  status!: BookingStatus.APPROVED | BookingStatus.REJECTED;

  @IsString()
  @IsOptional()
  landlordNote?: string;

  @IsDateString()
  @IsOptional()
  alternativeDate?: string;
}

export class CompleteBookingDto {
  @IsEnum([BookingStatus.COMPLETED, BookingStatus.NO_SHOW], {
    message: 'Status must be completed or no_show',
  })
  status!: BookingStatus.COMPLETED | BookingStatus.NO_SHOW;
}
