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
      return res
        .status(400)
        .json({ success: false, message: 'Укажите другого пользователя' });
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
    return res
      .status(500)
      .json({ success: false, message: 'Ошибка при создании чата' });
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

        let name = chat.name;
        if (chat.type === 'private') {
          const otherUser = chat.participants.find((p) => p.id !== userId);
          name = otherUser?.displayName || otherUser?.username || 'Чат';
        }

        return {
          ...chat,
          name,
          lastMessage,
        };
      }),
    );

    return res.json({ success: true, data: enrichedChats });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: 'Ошибка при получении чатов' });
  }
};

export const getChatById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const chat = await chatRepository.getChatById(id, userId);

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Чат не найден или нет доступа' });
    }

    let enrichedChat = { ...chat };
    if (chat.type === 'private') {
      const otherUser = chat.participants.find(p => p.id !== userId);
      enrichedChat.name = otherUser?.displayName || otherUser?.username || 'Чат';
    }

    return res.json({
      success: true,
      data: enrichedChat,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Ошибка при получении чата' });
  }
};
