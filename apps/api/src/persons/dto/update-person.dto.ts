import { IsString, IsNumber, IsOptional, IsIn, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

const GENDERS = ['male', 'female', 'unspecified'] as const;

export class UpdatePersonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(GENDERS)
  gender?: 'male' | 'female' | 'unspecified' | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  birthYear?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  deathYear?: number | null;

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
