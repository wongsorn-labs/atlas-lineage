import { IsInt, IsOptional, IsPositive, IsString, MaxLength, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PERIOD_MAX_YEAR, PERIOD_MIN_YEAR } from '@wongsorn-labs/atlas-lineage-shared';

export class CreatePeriodDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  treeId: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  personId: number;

  @IsString()
  @MaxLength(60)
  groupName: string;

  @IsInt()
  @Min(PERIOD_MIN_YEAR)
  @Max(PERIOD_MAX_YEAR)
  @Type(() => Number)
  fromYear: number;

  @IsOptional()
  @IsInt()
  @Min(PERIOD_MIN_YEAR)
  @Max(PERIOD_MAX_YEAR)
  @Type(() => Number)
  toYear?: number | null;
}
