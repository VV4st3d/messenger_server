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
      .leftJoinAndSelect('chat.participants', 'participants')
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

  async createGroupChat(
    creatorId: string,
    name: string,
    participantIds: string[],
  ): Promise<Chat> {
    const chat = this.repo.create({
      type: 'group',
      name: name.trim(),
      creator_id: creatorId, 
    });

    const savedChat = await this.repo.save(chat);

    const values = participantIds.map((userId) => ({
      chat_id: savedChat.id,
      user_id: userId,
    }));

    await AppDataSource.createQueryBuilder()
      .insert()
      .into('chat_participants')
      .values(values)
      .execute();

    return this.repo
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.participants', 'participants')
      .where('chat.id = :id', { id: savedChat.id })
      .getOneOrFail();
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
      .where('chat.id = :chatId', { chatId })
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
