import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateTreeDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
