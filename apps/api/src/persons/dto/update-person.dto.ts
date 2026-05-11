import { IsString, IsNumber, IsOptional, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePersonDto {
  @IsOptional()
  @IsString()
  name?: string;

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
