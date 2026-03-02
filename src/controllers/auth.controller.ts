import { Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/password.utils';
import { generateToken } from '../utils/jwt.utils';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const register = async (req: Request, res: Response) => {
  try {
    const dto = plainToInstance(RegisterDto, req.body);

    const errors = await validate(dto);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: errors.map((err) => ({
          field: err.property,
          messages: Object.values(err.constraints || {}),
        })),
      });
    }

    const { username, email, password, displayName } = dto;

    const existingByEmail = await userRepository.findByEmail(email);
    if (existingByEmail) {
      return res.status(409).json({
        success: false,
        message: 'Пользователь с таким email уже существует',
      });
    }

    const existingByUsername = await userRepository.findByUsername(username);
    if (existingByUsername) {
      return res.status(409).json({
        success: false,
        message: 'Такое имя пользователя уже занято',
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await userRepository.create({
      username,
      email,
      passwordHash: hashedPassword,
      displayName: displayName || username,
    });

    const token = generateToken({ userId: user.id, email: user.email });

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (err: any) {
    console.error('[REGISTER ERROR]', err);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при регистрации',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const dto = plainToInstance(LoginDto, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: errors.map((e) => e.constraints),
      });
    }

    const user = await userRepository.findByEmail(dto.email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль',
      });
    }

    const isPasswordValid = await comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль',
      });
    }

    const token = generateToken({ userId: user.id, email: user.email });

    await userRepository.setOnlineStatus(user.id, true);

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при входе',
    });
  }
};

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;

    const user = await userRepository.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден',
      });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error('Ошибка получения текущего пользователя:', err);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
    });
  }
};
