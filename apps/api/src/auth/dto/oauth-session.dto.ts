import { IsString, MinLength } from 'class-validator';

export class OAuthSessionDto {
  @IsString()
  @MinLength(1)
  accessToken: string;

  @IsString()
  @MinLength(1)
  refreshToken: string;
}
