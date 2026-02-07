import { Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import path from 'path';

export const updateAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Файл не загружен' });
    }

    const userId = req.user!.userId;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    await userRepository.update(userId, { avatarUrl });

    return res.json({
      success: true,
      data: { avatarUrl },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Ошибка загрузки аватарки' });
  }
};

export const checkEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email обязателен и должен быть строкой',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await userRepository.findByEmail(normalizedEmail);

    return res.json({
      success: true,
      data: {
        exists: !!existingUser,
      },
    });
  } catch (err) {
    console.error('Ошибка проверки email:', err);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
    });
  }
};