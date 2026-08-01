import { IsInt, IsOptional, IsPositive, IsString, Length, ValidateIf } from 'class-validator';

export class UpdateProfileSettingsDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(3, 3)
  defaultCountry?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @IsPositive()
  primaryTreeId?: number | null;
}
