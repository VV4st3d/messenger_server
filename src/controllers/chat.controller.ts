import { Request, Response } from 'express';
import { chatRepository } from '../repositories/chat.repository';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { messageRepository } from '../repositories/message.repository';

export const createOrGetPrivateChat = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const currentUserId = req.user!.userId;
    const { otherUserId } = req.body;

    if (!otherUserId || otherUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Укажите другого пользователя',
      });
    }

    const chat = await chatRepository.getOrCreatePrivateChat(
      currentUserId,
      otherUserId,
    );

    return res.json({
      success: true,
      data: chat,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при создании чата',
    });
  }
};

export const createGroupChat = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const creatorId = req.user!.userId;
    const { name, participantIds } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Название группы обязательно',
      });
    }

    if (
      !participantIds ||
      !Array.isArray(participantIds) ||
      participantIds.length < 2
    ) {
      return res.status(400).json({
        success: false,
        message: 'В группе должно быть минимум 2 участника (кроме создателя)',
      });
    }

    const uniqueIds = [...new Set([...participantIds, creatorId])];

    const chat = await chatRepository.createGroupChat(
      creatorId,
      name.trim(),
      uniqueIds,
    );
    return res.status(201).json({
      success: true,
      data: chat,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Ошибка создания группы',
    });
  }
};

export const getUserChats = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;
    const chats = await chatRepository.getUserChats(userId);

    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await messageRepository.findLastMessageByChatId(
          chat.id,
        );

        let name = chat.name || null;
        let avatarUrl: string | null = null;

        if (chat.type === 'private') {
          const otherUser = chat.participants.find((p) => p.id !== userId);
          name = otherUser?.displayName || otherUser?.username || 'Чат';
          avatarUrl = otherUser?.avatarUrl || null;
        }

        return {
          ...chat,
          name,
          avatarUrl,
          lastMessage,
        };
      }),
    );

    return res.json({ success: true, data: enrichedChats });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при получении чатов',
    });
  }
};

export const getChatById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const chat = await chatRepository.getChatById(id, userId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден или нет доступа',
      });
    }

    let name = chat.name || null;
    let avatarUrl: string | null = null;

    if (chat.type === 'private') {
      const otherUser = chat.participants.find((p) => p.id !== userId);
      name = otherUser?.displayName || otherUser?.username || 'Чат';
      avatarUrl = otherUser?.avatarUrl || null;
    }

    return res.json({
      success: true,
      data: {
        ...chat,
        name,
        avatarUrl,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при получении чата',
    });
  }
};
