import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { AppDataSource } from '../config/data-source';
import { chatRepository } from './chat.repository';
import path from 'path';
import fs from 'fs/promises';

type Direction = 'before' | 'after' | 'initial';

interface GetMessagesOptions {
  limit?: number;
  cursorCreatedAt?: Date | string;
  direction?: Direction;
}

export class MessageRepository {
  private repo: Repository<Message>;

  constructor() {
    this.repo = AppDataSource.getRepository(Message);
  }

  async createMessage(
    chatId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'file' | 'system' | 'ai_generated' | 'sticker' = 'text',
  ): Promise<Message> {
    const message = this.repo.create({
      chat: { id: chatId },
      sender: { id: senderId },
      content,
      type,
      isRead: false,
    });

    const saved = await this.repo.save(message);
    return this.findWithRelations({ id: saved.id }) as Promise<Message>;
  }

  async getMessagesForChat(
    chatId: string,
    options: GetMessagesOptions = {},
  ): Promise<{
    messages: Message[];
    hasMoreTop: boolean;
    hasMoreBottom: boolean;
  }> {
    const { limit = 30, cursorCreatedAt, direction = 'initial' } = options;

    const qb = this.repo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.chat', 'chat')
      .where('message.chat.id = :chatId', { chatId });

    if (direction === 'before' && cursorCreatedAt) {
      qb.andWhere('message.createdAt < :cursor', {
        cursor: new Date(cursorCreatedAt),
      });
      qb.orderBy('message.createdAt', 'DESC');
      qb.take(limit + 1);
    }

    if (direction === 'after' && cursorCreatedAt) {
      qb.andWhere('message.createdAt >= :cursor', {
        cursor: new Date(cursorCreatedAt),
      });
      qb.orderBy('message.createdAt', 'ASC');
      qb.take(limit + 50);
    }

    if (direction === 'initial') {
      qb.orderBy('message.createdAt', 'DESC');
      qb.take(limit + 1);
    }

    const raw = await qb.getMany();

    let processedMessages = raw;

    if (direction === 'after' && cursorCreatedAt && raw.length > 0) {
      const cursorDate = new Date(cursorCreatedAt).getTime();

      processedMessages = raw.filter((msg) => {
        return new Date(msg.createdAt).getTime() > cursorDate;
      });
    }

    const hasExtra = processedMessages.length > limit;
    const sliced = hasExtra
      ? processedMessages.slice(0, limit)
      : processedMessages;

    const messages = direction === 'after' ? sliced : sliced.reverse();

    let hasMoreTop = false;
    let hasMoreBottom = false;

    if (direction === 'initial') {
      hasMoreTop = hasExtra;
      hasMoreBottom = false;
    }

    if (direction === 'before') {
      hasMoreTop = hasExtra;
      if (messages.length > 0) {
        const oldestMessage = messages[messages.length - 1];
        hasMoreBottom = await this.hasMessagesAfter(
          chatId,
          oldestMessage.createdAt,
        );
      }
    }

    if (direction === 'after') {
      if (messages.length > 0) {
        const newestMessage = messages[0];
        hasMoreTop = await this.hasMessagesBefore(
          chatId,
          newestMessage.createdAt,
        );
      }
      hasMoreBottom = hasExtra;
    }

    return {
      messages,
      hasMoreTop,
      hasMoreBottom,
    };
  }

  async findLastMessageByChatId(chatId: string): Promise<Message | null> {
    const message = await this.repo.findOne({
      where: { chat: { id: chatId } },
      order: { createdAt: 'DESC' },
      relations: ['sender', 'chat'],
    });
    return message;
  }

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('chat_id = :chatId', { chatId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere('isRead = false')
      .execute();
  }

  async findByIdWithRelations(id: string): Promise<Message | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['sender', 'chat'],
    });
  }

  async searchInChat(
    chatId: string,
    query: string,
    limit = 50,
  ): Promise<Message[]> {
    if (!query.trim()) return [];

    const searchQuery = query
      .trim()
      .split(/\s+/)
      .map((w) => `${w}:*`)
      .join(' & ');

    return this.repo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.chat', 'chat')
      .where('chat.id = :chatId', { chatId })
      .andWhere(
        'message."searchVector" @@ to_tsquery(\'simple\', :searchQuery)',
        { searchQuery },
      )
      .orderBy(
        'ts_rank_cd(message."searchVector", to_tsquery(\'simple\', :searchQuery))',
        'DESC',
      )
      .addOrderBy('message."createdAt"', 'DESC')
      .limit(limit)
      .getMany();
  }

  async searchGlobal(
    userId: string,
    query: string,
    limit = 50,
  ): Promise<Message[]> {
    if (!query.trim()) return [];

    const searchQuery = query
      .trim()
      .split(/\s+/)
      .map((w) => `${w}:*`)
      .join(' & ');

    return this.repo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.chat', 'chat')
      .innerJoin(
        'chat_participants',
        'cp',
        'cp.chat_id = chat.id AND cp.user_id = :userId',
        { userId },
      )
      .where('message."searchVector" @@ to_tsquery(\'simple\', :searchQuery)', {
        searchQuery,
      })
      .orderBy(
        'ts_rank_cd(message."searchVector", to_tsquery(\'simple\', :searchQuery))',
        'DESC',
      )
      .addOrderBy('message."createdAt"', 'DESC')
      .limit(limit)
      .getMany();
  }

  async findMessagesBeforeWithMeta(
    chatId: string,
    createdAt: Date,
    anchorId: string,
    limit: number,
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const messages = await this.repo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.chat', 'chat')
      .where('message.chat_id = :chatId', { chatId })
      .andWhere('message.createdAt < :createdAt', { createdAt })
      .andWhere('message.id != :anchorId', { anchorId })
      .orderBy('message.createdAt', 'DESC')
      .limit(limit + 1)
      .getMany();

    const hasMore = messages.length > limit;
    const result = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: result.reverse(),
      hasMore,
    };
  }

  async findMessagesAfterWithMeta(
    chatId: string,
    createdAt: Date,
    anchorId: string,
    limit: number,
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const messages = await this.repo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.chat', 'chat')
      .where('message.chat_id = :chatId', { chatId })
      .andWhere('message.createdAt > :createdAt', { createdAt })
      .andWhere('message.id != :anchorId', { anchorId })
      .orderBy('message.createdAt', 'ASC')
      .limit(limit + 1)
      .getMany();

    const hasMore = messages.length > limit;
    const result = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: result,
      hasMore,
    };
  }
  async getHasMoreAround(
    chatId: string,
    topCreatedAt: Date,
    bottomCreatedAt: Date,
  ): Promise<{
    hasMoreTop: boolean;
    hasMoreBottom: boolean;
  }> {
    const hasMoreTop = await this.repo
      .createQueryBuilder('message')
      .where('message.chat.id = :chatId', { chatId })
      .andWhere('message.createdAt < :top', { top: topCreatedAt })
      .limit(1)
      .getCount()
      .then((c) => c > 0);

    const hasMoreBottom = await this.repo
      .createQueryBuilder('message')
      .where('message.chat.id = :chatId', { chatId })
      .andWhere('message.createdAt > :bottom', {
        bottom: bottomCreatedAt,
      })
      .limit(1)
      .getCount()
      .then((c) => c > 0);

    return {
      hasMoreTop,
      hasMoreBottom,
    };
  }

  async hasMessagesBefore(chatId: string, createdAt: Date): Promise<boolean> {
    return this.repo
      .createQueryBuilder('message')
      .where('message.chat.id = :chatId', { chatId })
      .andWhere('message.createdAt < :createdAt', { createdAt })
      .getExists();
  }

  async hasMessagesAfter(chatId: string, createdAt: Date): Promise<boolean> {
    return this.repo
      .createQueryBuilder('message')
      .where('message.chat.id = :chatId', { chatId })
      .andWhere('message.createdAt > :createdAt', { createdAt })
      .getExists();
  }

  async pinMessage(
    messageId: string,
    chatId: string,
    userId: string,
  ): Promise<Message> {
    const message = await this.repo.findOne({
      where: { id: messageId, chat: { id: chatId } },
      relations: ['chat'],
    });

    if (!message) {
      throw new Error('Сообщение не найдено');
    }

    const isParticipant = await chatRepository.isUserInChat(chatId, userId);
    if (!isParticipant) {
      throw new Error('Нет доступа к чату');
    }

    message.isPinned = true;
    await this.repo.save(message);

    return this.repo.findOneOrFail({
      where: { id: messageId },
      relations: ['chat', 'sender'],
    });
  }

  async unpinMessage(
    messageId: string,
    chatId: string,
    userId: string,
  ): Promise<Message> {
    const message = await this.repo.findOne({
      where: { id: messageId, chat: { id: chatId } },
      relations: ['chat'],
    });

    if (!message) {
      throw new Error('Сообщение не найдено');
    }

    const isParticipant = await chatRepository.isUserInChat(chatId, userId);
    if (!isParticipant) {
      throw new Error('Нет доступа к чату');
    }

    message.isPinned = false;
    await this.repo.save(message);

    return this.repo.findOneOrFail({
      where: { id: messageId },
      relations: ['chat', 'sender'],
    });
  }

  async getPinnedMessages(chatId: string): Promise<Message[]> {
    return this.repo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.chat.id = :chatId', { chatId })
      .andWhere('message.isPinned = :isPinned', { isPinned: true })
      .orderBy('message.createdAt', 'DESC')
      .getMany();
  }
  private async findWithRelations(where: any): Promise<Message | null> {
    return this.repo.findOne({
      where,
      relations: ['chat', 'sender'],
    });
  }

  async createMediaMessage(
    chatId: string,
    senderId: string,
    filePath: string,
    fileType: string,
    fileSize: number,
    content?: string,
  ): Promise<Message> {
    const message = this.repo.create({
      chat: { id: chatId },
      sender: { id: senderId },
      content: content || '',
      type: fileType.startsWith('image/') ? 'image' : 'file',
      filePath,
      fileType,
      fileSize,
      isRead: false,
    });

    return this.repo.save(message);
  }

  async deleteMessage(messageId: string): Promise<void> {
    const message = await this.repo.findOne({ where: { id: messageId } });
    if (message?.filePath) {
      await fs.unlink(path.join(__dirname, '../../', message.filePath));
    }
    await this.repo.delete(messageId);
  }
  async save(message: Message): Promise<Message> {
    return this.repo.save(message);
  }
}

export const messageRepository = new MessageRepository();
