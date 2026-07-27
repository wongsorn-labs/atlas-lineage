import { IsString, Length, ValidateIf } from 'class-validator';

export class UpdateProfileSettingsDto {
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(3, 3)
  defaultCountry: string | null;
}
