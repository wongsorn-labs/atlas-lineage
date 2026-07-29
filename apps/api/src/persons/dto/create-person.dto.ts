import { IsString, IsNumber, IsOptional, IsIn, Matches, Min, Max, IsInt, IsPositive, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

const GENDERS = ['male', 'female', 'unspecified'] as const;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreatePersonDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  treeId: number;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsIn(GENDERS)
  gender?: 'male' | 'female' | 'unspecified' | null;

  @IsInt()
  @Type(() => Number)
  birthYear: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  birthMonth?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  birthDay?: number | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'birthTime must be in HH:MM format' })
  birthTime?: string | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  deathYear?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  deathMonth?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  deathDay?: number | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'deathTime must be in HH:MM format' })
  deathTime?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  birthLat?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  birthLng?: number | null;

  @IsOptional()
  @IsString()
  birthPlace?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
