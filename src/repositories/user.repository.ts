import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AppDataSource } from '../config/data-source';

export class UserRepository {
  private repo: Repository<User>;

  constructor() {
    this.repo = AppDataSource.getRepository(User);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repo.findOneBy({ username });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repo.create(userData);
    return this.repo.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.repo.update(id, data);
    return this.findById(id) as Promise<User>;
  }

  async setOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await this.repo.update(id, { isOnline });
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.repo.update(userId, { lastActive: new Date() });
  }

  async setOnline(userId: string, isOnline: boolean): Promise<void> {
    await this.repo.update(userId, {
      isOnline,
      lastActive: new Date(),
    });
  }

  async searchByUsername(
    currentUserId: string,
    usernameQuery: string,
    limit = 20,
  ): Promise<any[]> {
    if (!usernameQuery.trim() || usernameQuery.length < 2) {
      return [];
    }

    const search = usernameQuery.trim().toLowerCase();

    return (
      this.repo
        .createQueryBuilder('user')
        .where('user.id != :currentUserId', { currentUserId })
        .andWhere('LOWER(user.username) LIKE :search', {
          search: `%${search}%`,
        })
        .leftJoin(
          'friend_requests',
          'fr_sent',
          "fr_sent.from_user_id = :currentUserId AND fr_sent.to_user_id = user.id AND fr_sent.status = 'accepted'",
          { currentUserId },
        )
        .leftJoin(
          'friend_requests',
          'fr_received',
          "fr_received.to_user_id = :currentUserId AND fr_received.from_user_id = user.id AND fr_received.status = 'accepted'",
          { currentUserId },
        )
        .select([
          'user.id AS id',
          'user.username AS username',
          'user.displayName AS displayName',
          'user.avatarUrl AS avatarUrl',
          'user.status AS status',
          'user.isOnline AS isOnline',
          'CASE WHEN fr_sent.id IS NOT NULL OR fr_received.id IS NOT NULL THEN true ELSE false END AS isFriend',
        ])
        .limit(limit)
        .orderBy('user.username', 'ASC')
        .getRawMany()
    );
  }
}

export const userRepository = new UserRepository();
