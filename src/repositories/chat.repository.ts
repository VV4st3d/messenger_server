import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { User } from '../entities/user.entity';
import { AppDataSource } from '../config/data-source';

export class ChatRepository {
  private repo: Repository<Chat>;

  constructor() {
    this.repo = AppDataSource.getRepository(Chat);
  }

  async getOrCreatePrivateChat(
    user1Id: string,
    user2Id: string,
  ): Promise<Chat> {
    let chat = await this.repo
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'p1')
      .innerJoin('chat.participants', 'p2')
      .where('chat.type = :type', { type: 'private' })
      .andWhere('p1.id = :user1 AND p2.id = :user2', {
        user1: user1Id,
        user2: user2Id,
      })
      .orWhere('p1.id = :user2 AND p2.id = :user1', {
        user1: user1Id,
        user2: user2Id,
      })
      .getOne();

    if (!chat) {
      chat = this.repo.create({
        type: 'private',
        participants: [{ id: user1Id }, { id: user2Id }],
      });
      chat = await this.repo.save(chat);
    }

    return chat;
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    return this.repo
      .createQueryBuilder('chat')
      .innerJoin(
        'chat.participants',
        'myParticipation',
        'myParticipation.id = :userId',
        { userId },
      )
      .leftJoinAndSelect('chat.participants', 'participant')
      .orderBy('chat.createdAt', 'DESC')
      .distinct(true)
      .getMany();
  }

  async getChatById(chatId: string, userId: string): Promise<Chat | null> {
    return this.repo
      .createQueryBuilder('chat')
      .innerJoin(
        'chat.participants',
        'myParticipation',
        'myParticipation.id = :userId',
        { userId },
      ) 
      .leftJoinAndSelect('chat.participants', 'participant') 
      .leftJoinAndSelect('chat.messages', 'message') 
      .leftJoinAndSelect('message.sender', 'sender') 
      .where('chat.id = :chatId', { chatId })
      .orderBy('message.createdAt', 'ASC')
      .getOne();
  }

  async isUserInChat(chatId: string, userId: string): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'participant')
      .where('chat.id = :chatId', { chatId })
      .andWhere('participant.id = :userId', { userId })
      .getCount();

    return count > 0;
  }

  async getChatParticipants(chatId: string): Promise<User[]> {
    const chat = await this.repo
      .createQueryBuilder('chat')
      .innerJoinAndSelect('chat.participants', 'participant')
      .where('chat.id = :chatId', { chatId })
      .getOne();

    return chat?.participants || [];
  }
}

export const chatRepository = new ChatRepository();
