import { Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import path from 'path';
import { log } from 'console';

export const updateAvatar = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'Файл не загружен' });
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
    return res
      .status(500)
      .json({ success: false, message: 'Ошибка загрузки аватарки' });
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

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;
    const { bio } = req.body;

    if (bio !== undefined && bio.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Bio слишком длинный (макс 1000 символов)',
      });
    }

    await userRepository.updateBio(userId, bio || null);

    return res.json({ success: true, message: 'Профиль обновлён' });
  } catch (err) {
    console.error('Ошибка обновления профиля:', err);
    return res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
};

export const getUserProfile = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'id пользователя обязателен',
      });
    }

    const profile = await userRepository.getPublicProfile(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден',
      });
    }

    return res.json({
      success: true,
      data: {
        id: profile.user_id,
        username: profile.user_username,
        displayName: profile.user_displayName,
        avatarUrl: profile.user_avatarurl,
        status: profile.user_status,
        isOnline: profile.user_isOnline,
        lastActive: profile.user_lastActive,
        createdAt: profile.user_createdAt,
        bio: profile.user_bio || null,
        isOwnProfile: id === currentUserId,
      },
    });
  } catch (err) {
    console.error('Ошибка получения профиля:', err);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера',
    });
  }
};
