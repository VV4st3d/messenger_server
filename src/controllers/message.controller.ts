import { Request, Response } from 'express';
import { messageRepository } from '../repositories/message.repository';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { chatRepository } from '../repositories/chat.repository';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import { io } from '../app';

export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { chatId, content, type = 'text' } = req.body;

    if (!chatId || !content) {
      return res
        .status(400)
        .json({ success: false, message: 'chatId и content обязательны' });
    }

    const message = await messageRepository.createMessage(
      chatId,
      userId,
      content,
      type,
    );

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: 'Ошибка отправки сообщения' });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/'); 
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'video/mp4',
      'audio/mpeg',
      'application/pdf',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Недопустимый тип файла'));
  },
});

export const uploadMedia = [
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { chatId, content = '' } = req.body;
      const file = req.file;

      if (!chatId || !file) {
        if (file) await fs.unlink(file.path);
        return res
          .status(400)
          .json({ success: false, message: 'chatId и file обязательны' });
      }

      const isParticipant = await chatRepository.isUserInChat(chatId, userId);
      if (!isParticipant) {
        await fs.unlink(file.path);
        return res
          .status(403)
          .json({ success: false, message: 'Нет доступа к чату' });
      }

      const chatDir = path.join(__dirname, '../../uploads/chats', chatId);
      await fs.mkdir(chatDir, { recursive: true });

      const newFileName = `${uuid()}${path.extname(file.originalname)}`;
      const finalPath = path.join(chatDir, newFileName);

      await fs.rename(file.path, finalPath);

      const relativePath = `/chats/${chatId}/${newFileName}`;

      const message = await messageRepository.createMessage(
        chatId,
        userId,
        content,
        file.mimetype.startsWith('image/') ? 'image' : 'file',
      );

      message.filePath = relativePath;
      message.fileType = file.mimetype;
      message.fileSize = file.size;

      await messageRepository.save(message);

      const fullMessage = await messageRepository.findByIdWithRelations(
        message.id,
      );

      io.to(chatId).emit('newMessage', fullMessage);

      return res.json({ success: true, data: fullMessage });
    } catch (err) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: 'Ошибка загрузки' });
    }
  },
];
export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const {
      limit = 30,
      cursorCreatedAt,
      direction = 'initial',
    } = req.query as {
      limit?: number;
      cursorCreatedAt?: string;
      direction?: 'before' | 'after' | 'initial';
    };

    const isParticipant = await chatRepository.isUserInChat(
      chatId,
      req.user!.userId,
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к чату',
      });
    }

    const result = await messageRepository.getMessagesForChat(chatId, {
      limit: Number(limit),
      cursorCreatedAt,
      direction,
    });

    if (
      (direction === 'after' || direction === 'initial') &&
      result.messages.length > 0
    ) {
      await messageRepository.markMessagesAsRead(chatId, req.user!.userId);
    }

    return res.json({
      success: true,
      data: {
        messages: result.messages,
        hasMoreTop: result.hasMoreTop,
        hasMoreBottom: result.hasMoreBottom,
        direction,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Ошибка получения сообщений',
    });
  }
};

export const searchMessagesGlobal = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { query, limit = 50 } = req.query;

    if (!query || typeof query !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'query обязателен' });
    }

    const messages = await messageRepository.searchGlobal(
      req.user!.userId,
      query.trim(),
      Number(limit),
    );

    return res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error('Глобальный поиск ошибка:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Ошибка глобального поиска' });
  }
};

export const searchMessagesInChat = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { chatId } = req.params;
    const { query, limit = 50 } = req.query;

    if (!query || typeof query !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'query обязателен' });
    }

    const isParticipant = await chatRepository.isUserInChat(
      chatId,
      req.user!.userId,
    );
    if (!isParticipant) {
      return res
        .status(403)
        .json({ success: false, message: 'Нет доступа к чату' });
    }

    const messages = await messageRepository.searchInChat(
      chatId,
      query.trim(),
      Number(limit),
    );

    return res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error('Поиск в чате ошибка:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Ошибка поиска в чате' });
  }
};

export const pinMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { chatId } = req.body;

    const message = await messageRepository.pinMessage(
      messageId,
      chatId,
      req.user!.userId,
    );

    return res.json({
      success: true,
      data: message,
    });
  } catch (err) {
    console.error(err);
  }
};

export const unpinMessage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { messageId } = req.params;
    const { chatId } = req.body;

    const message = await messageRepository.unpinMessage(
      messageId,
      chatId,
      req.user!.userId,
    );

    return res.json({
      success: true,
      data: message,
    });
  } catch (err) {
    console.error(err);
  }
};

export const getPinnedMessages = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { chatId } = req.params;

    const isParticipant = await chatRepository.isUserInChat(
      chatId,
      req.user!.userId,
    );
    if (!isParticipant) {
      return res
        .status(403)
        .json({ success: false, message: 'Нет доступа к чату' });
    }

    const pinned = await messageRepository.getPinnedMessages(chatId);

    return res.json({
      success: true,
      data: pinned,
    });
  } catch (err) {
    console.error('Ошибка получения закреплённых:', err);
    return res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
};

export const getMessageContext = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { messageId } = req.params;
    const limit = Number(req.query.limit) || 15;

    const message = await messageRepository.findByIdWithRelations(messageId);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: 'Сообщение не найдено' });
    }

    const isParticipant = await chatRepository.isUserInChat(
      message.chat.id,
      req.user!.userId,
    );

    if (!isParticipant) {
      return res
        .status(403)
        .json({ success: false, message: 'Нет доступа к чату' });
    }

    const [before, after] = await Promise.all([
      messageRepository.findMessagesBeforeWithMeta(
        message.chat.id,
        message.createdAt,
        message.id,
        limit,
      ),
      messageRepository.findMessagesAfterWithMeta(
        message.chat.id,
        message.createdAt,
        message.id,
        limit,
      ),
    ]);

    const messages = [...before.messages, message, ...after.messages];

    return res.json({
      success: true,
      data: {
        anchorMessageId: message.id,
        messages,

        hasMoreTop: before.hasMore,
        hasMoreBottom: after.hasMore,
      },
    });
  } catch (err) {
    console.error('getMessageContext error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Ошибка получения контекста' });
  }
};

export const deleteMessage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { messageId } = req.params;
    const { chatId } = req.body;

    await messageRepository.deleteMessage(messageId);

    return res.json({ success: true, message: 'Сообщение удалено' });
  } catch (err) {
    console.error(err);
  }
};
