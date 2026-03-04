import { Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { User } from '../entities/user.entity';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import { log } from 'console';

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/photos');
    fs.mkdir(dir, { recursive: true }).then(() => cb(null, dir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const uploadPhotoMulter = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Только изображения'));
  },
});

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

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    fs.mkdir(dir, { recursive: true }).then(() => cb(null, dir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения: jpg, png, gif, webp'));
    }
  },
});

export const updateProfile = [
  uploadAvatar.single('avatar'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { bio, username, displayName } = req.body;
      const file = req.file;

      const updates: Partial<User> = {};

      if (bio !== undefined) {
        if (typeof bio !== 'string' || bio.length > 1000) {
          if (file) await fs.unlink(file.path);
          return res.status(400).json({
            success: false,
            message: 'Bio должен быть строкой до 1000 символов',
          });
        }
        updates.bio = bio.trim() || undefined;
      }

      if (username !== undefined) {
        if (
          typeof username !== 'string' ||
          username.length < 3 ||
          username.length > 30
        ) {
          if (file) await fs.unlink(file.path);
          return res.status(400).json({
            success: false,
            message: 'Username должен быть от 3 до 30 символов',
          });
        }

        const existing = await userRepository.findByUsername(username);
        if (existing && existing.id !== userId) {
          if (file) await fs.unlink(file.path);
          return res.status(409).json({
            success: false,
            message: 'Этот username уже занят',
          });
        }

        updates.username = username.trim();
      }

      if (displayName !== undefined) {
        if (typeof displayName !== 'string' || displayName.length > 50) {
          if (file) await fs.unlink(file.path);
          return res.status(400).json({
            success: false,
            message: 'DisplayName должен быть строкой до 50 символов',
          });
        }
        updates.displayName = displayName.trim() || undefined;
      }

      if (file) {
        const avatarUrl = `/uploads/avatars/${file.filename}`;
        updates.avatarUrl = avatarUrl;

        const currentUser = await userRepository.findById(userId);
        if (currentUser?.avatarUrl) {
          const oldPath = path.join(__dirname, '../../', currentUser.avatarUrl);
          await fs.unlink(oldPath).catch(() => {});
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.json({ success: true, message: 'Ничего не изменено' });
      }

      await userRepository.update(userId, updates);

      const profile = await userRepository.getPublicProfile(userId, userId);

      return res.json({
        success: true,
        message: 'Профиль обновлён',
        data: {
          id: profile.user_id,
          username: profile.user_username,
          displayName: profile.user_displayName,
          avatarUrl: profile.user_avatarUrl,
          status: profile.user_status,
          isOnline: profile.user_isOnline,
          lastActive: profile.user_lastActive,
          createdAt: profile.user_createdAt,
          bio: profile.user_bio || null,
        },
      });
    } catch (err) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      console.error('Ошибка обновления профиля:', err);
      return res
        .status(500)
        .json({ success: false, message: 'Ошибка сервера' });
    }
  },
];

export const getUserProfile = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.userId;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'id пользователя обязателен' });
    }

    const profile = await userRepository.getPublicProfile(id, currentUserId);

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: 'Пользователь не найден' });
    }

    return res.json({
      success: true,
      data: {
        id: profile.user_id,
        username: profile.user_username,
        displayName: profile.user_displayName,
        avatarUrl: profile.user_avatarUrl,
        status: profile.user_status,
        isOnline: profile.user_isOnline,
        lastActive: profile.user_lastActive,
        createdAt: profile.user_createdAt,
        bio: profile.user_bio || null,
        photos: profile.user_photos,
        friendRequestStatus: profile.friendRequestStatus || 'none',
        friendRequestId: profile.friendRequestId || null,
        isOwnProfile: id === currentUserId,
      },
    });
  } catch (err) {
    console.error('Ошибка получения профиля:', err);
    return res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
};

export const uploadProfilePhoto = [
  uploadPhotoMulter.single('photo'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const file = req.file;

      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: 'Фото не загружено' });
      }

      const photoUrl = `/uploads/photos/${file.filename}`;

      await userRepository.addPhoto(userId, photoUrl);

      return res.json({
        success: true,
        data: { photoUrl },
      });
    } catch (err) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      console.error('Ошибка загрузки фото:', err);
      return res
        .status(500)
        .json({ success: false, message: 'Ошибка сервера' });
    }
  },
];
