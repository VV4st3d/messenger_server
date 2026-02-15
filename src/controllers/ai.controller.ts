import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { messageRepository } from '../repositories/message.repository';
import { chatRepository } from '../repositories/chat.repository';

export const generateAiSummary = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'messageId обязателен в параметрах',
      });
    }

    const message = await messageRepository.findByIdWithRelations(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Сообщение не найдено',
      });
    }

    const isParticipant = await chatRepository.isUserInChat(
      message.chat.id,
      userId,
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к чату',
      });
    }

    const content = message.content?.trim() || '';

    if (content.length < 300) {
      return res.status(400).json({
        success: false,
        message:
          'Сообщение слишком короткое для генерации содержания (нужно минимум 300 символов)',
      });
    };

    const generated = await aiService.generateResponse(content);

    return res.json({
      success: true,
      data: {
        summary: generated.trim(),
        originalMessageId: messageId,
        originalLength: content.length,
      },
    });
  } catch (err) {
    console.error('Ошибка генерации содержания:', err);
    return res.status(500).json({
      success: false,
      message: 'Ошибка генерации содержания',
    });
  }
};
