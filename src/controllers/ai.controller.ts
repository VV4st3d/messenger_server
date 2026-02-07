import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { messageRepository } from '../repositories/message.repository';

export const generateAiResponse = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;
    const { chatId, prompt } = req.body;

    if (!chatId) {
      return res
        .status(400)
        .json({ success: false, message: 'chatId обязателен' });
    }

    // const messages = await messageRepository.getMessagesForChat(chatId, 20, 0);

    const user1Messages: string[] = [];
    let isCollectingUser1 = true;

    // for (let i = messages.length - 1; i >= 0; i--) {
    //   const msg = messages[i];
    //   if (msg.senderId !== userId) {
    //     if (isCollectingUser1) {
    //       user1Messages.unshift(msg.content);
    //     }
    //   } else {
    //     isCollectingUser1 = false;
    //   }
    // }

    const finalPrompt = prompt || user1Messages.join(' ');

    if (!finalPrompt.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Нет сообщений для генерации' });
    }

    const generated = await aiService.generateResponse(finalPrompt);

    return res.json({
      success: true,
      data: {
        text: generated,
        type: 'ai_generated',
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: 'Ошибка генерации ответа' });
  }
};
