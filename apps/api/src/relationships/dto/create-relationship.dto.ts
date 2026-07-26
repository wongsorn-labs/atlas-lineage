import { IsInt, IsPositive, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRelationshipDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  treeId: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  personId: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  relatedPersonId: number;

  @IsEnum(['parent', 'child', 'sibling', 'spouse', 'partner'])
  type: string;
}
