import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const VALUE_TYPES = ['text', 'number', 'date', 'longtext'] as const;
const VISIBILITIES = ['members', 'restricted'] as const;

export class CreateFieldDefinitionDto {
  @IsOptional()
  @Matches(/^[a-z][a-z0-9_]{1,39}$/, { message: 'key must be lowercase letters, digits or _' })
  key?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  category?: string;

  @IsOptional()
  @IsIn(VALUE_TYPES)
  valueType?: (typeof VALUE_TYPES)[number];

  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: (typeof VISIBILITIES)[number];
}

export class UpdateFieldDefinitionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  category?: string;

  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: (typeof VISIBILITIES)[number];
}
