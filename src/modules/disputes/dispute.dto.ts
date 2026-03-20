import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DisputeStatus } from '../../types';

export class UpdateDisputeStatusDto {
  @IsEnum(DisputeStatus)
  status!: DisputeStatus;

  @IsOptional()
  @IsString()
  resolution?: string;
}
