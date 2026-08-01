import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestPersonLinkDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  personId: number;
}
