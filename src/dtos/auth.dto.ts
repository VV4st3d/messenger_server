import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'Имя пользователя слишком короткое (мин. 3 символа)' })
  username!: string;

  @IsEmail({}, { message: 'Некорректный формат email' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  password!: string;

  @IsString()
  @IsOptional()
  displayName?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Некорректный формат email' })
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}