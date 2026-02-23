import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from './utils/jwt.utils';
import { AppDataSource } from './config/data-source';
import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import messageRoutes from './routes/message.routes';
import { messageRepository } from './repositories/message.repository';
import type { SendMessageData } from './types/types';
import friendRoutes from './routes/friend.routes';
import aiRoutes from './routes/ai.routes';
import { userRepository } from './repositories/user.repository';
import { chatRepository } from './repositories/chat.repository';
import userRoutes from './routes/user.routes';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use(errorHandler);

io.use((socket: Socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Аутентификация требуется'));
  }

  try {
    const payload = verifyToken(token);
    socket.data.user = payload;
    next();
  } catch (err) {
    next(new Error('Недействительный токен'));
  }
});

io.on('connection', async (socket: Socket) => {
  const userId = socket.data.user?.userId;

  if (!userId) {
    console.warn('Подключение без userId — отключаем');
    socket.disconnect(true);
    return;
  }

  console.log(`Пользователь ${userId} подключился (${socket.id})`);

  try {
    await userRepository.setOnline(userId, true);
    io.emit('userStatus', { userId, online: true, lastActive: new Date() });
  } catch (err) {
    console.error(`Ошибка установки online для ${userId}:`, err);
  }

  const joinedChats = new Set<string>();

  socket.on('joinChat', (chatId: string) => {
    if (typeof chatId !== 'string' || !chatId.trim()) {
      socket.emit('error', { message: 'Некорректный chatId' });
      return;
    }

    socket.join(chatId);
    joinedChats.add(chatId);
    console.log(`Пользователь ${userId} зашёл в чат ${chatId}`);

    socket.to(chatId).emit('userJoinedChat', { userId, chatId });
  });

  socket.on('leaveChat', (chatId: string) => {
    socket.leave(chatId);
    console.log(`Пользователь ${userId} покинул чат ${chatId}`);
  });

  socket.on('sendMessage', async (data: SendMessageData) => {
    const { chatId, content, type = 'text' } = data;

    if (!chatId || !content?.trim()) {
      socket.emit('error', { message: 'chatId и content обязательны' });
      return;
    }

    const isParticipant = await chatRepository.isUserInChat(chatId, userId);
    if (!isParticipant) {
      socket.emit('error', { message: 'Нет доступа к этому чату' });
      return;
    }

    try {
      const message = await messageRepository.createMessage(
        chatId,
        userId,
        content.trim(),
        type,
      );

      const savedMessage = await messageRepository.findByIdWithRelations(
        message.id,
      );

      if (!savedMessage) {
        throw new Error('Сообщение не найдено после сохранения');
      }

      io.to(chatId).emit('newMessage', savedMessage);

      const participants = await chatRepository.getChatParticipants(chatId);
      participants.forEach((p) => {
        if (p.id !== userId) {
          io.to(p.id).emit('newNotification', {
            type: 'message',
            chatId,
            senderId: userId,
            content:
              type === 'sticker'
                ? '[Стикер]'
                : content.substring(0, 50) + '...',
          });
        }
      });

      console.log(`Сообщение отправлено в чат ${chatId} от ${userId}`);
    } catch (err) {
      console.error(`Ошибка отправки в чат ${chatId} от ${userId}:`, err);
      socket.emit('error', {
        message: 'Не удалось отправить сообщение',
        error:
          process.env.NODE_ENV === 'development'
            ? (err as Error).message
            : undefined,
      });
    }
  });

  let typingTimeout: NodeJS.Timeout | null = null;

  socket.on('typing', (chatId: string) => {
    if (typeof chatId !== 'string') return;
    socket.to(chatId).emit('typing', {
      userId,
      chatId,
      username: socket.data.user?.email || 'Пользователь',
      isTyping: true,
    });

    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.to(chatId).emit('typing', {
        userId,
        chatId,
        isTyping: false,
      });
    }, 3000);
  });

  socket.on('stopTyping', (chatId: string) => {
    if (typingTimeout) clearTimeout(typingTimeout);
    socket.to(chatId).emit('typing', {
      userId,
      chatId,
      isTyping: false,
    });
  });

  socket.on('disconnect', async () => {
    console.log(`Пользователь ${userId} отключился`);

    try {
      await userRepository.setOnline(userId, false);
      io.emit('userStatus', {
        userId,
        online: false,
        lastActive: new Date(),
      });
    } catch (err) {
      console.error(`Ошибка установки offline для ${userId}:`, err);
    }
  });
});

const PORT = process.env.PORT || 8888;

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log('Соединение с базой данных установлено');

    httpServer.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Ошибка инициализации приложения:', error);
    process.exit(1);
  }
}

bootstrap();
export { io };
