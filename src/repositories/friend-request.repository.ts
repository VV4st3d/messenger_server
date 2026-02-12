import { Repository } from 'typeorm';
import { FriendRequest } from '../entities/friend-request.entity';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/user.entity';

export class FriendRequestRepository {
  private repo: Repository<FriendRequest>;

  constructor() {
    this.repo = AppDataSource.getRepository(FriendRequest);
  }

  async createRequest(
    fromUserId: string,
    toUserId: string,
  ): Promise<FriendRequest> {
    const request = this.repo.create({
      fromUser: { id: fromUserId },
      toUser: { id: toUserId },
      status: 'pending',
    });
    return this.repo.save(request);
  }

  async findPendingToUser(toUserId: string): Promise<FriendRequest[]> {
    return this.repo.find({
      where: { toUser: { id: toUserId }, status: 'pending' },
      relations: ['fromUser'],
    });
  }

  async findPendingFromUser(fromUserId: string): Promise<FriendRequest[]> {
    return this.repo.find({
      where: { fromUser: { id: fromUserId }, status: 'pending' },
      relations: ['toUser'],
    });
  }

  async acceptRequest(requestId: string): Promise<FriendRequest | null> {
    const request = await this.repo.findOne({
      where: { id: requestId },
      relations: ['fromUser', 'toUser'],
    });
    if (!request || request.status !== 'pending') return null;

    request.status = 'accepted';
    request.updatedAt = new Date();
    return this.repo.save(request);
  }

  async rejectRequest(requestId: string): Promise<FriendRequest | null> {
    const request = await this.repo.findOne({
      where: { id: requestId },
      relations: ['fromUser', 'toUser'],
    });
    if (!request || request.status !== 'pending') return null;

    request.status = 'rejected';
    request.updatedAt = new Date();
    return this.repo.save(request);
  }

  async findById(id: string): Promise<FriendRequest | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['fromUser', 'toUser'],
    });
  }

  async delete(requestId: string): Promise<void> {
    await this.repo.delete(requestId);
  }

  async findOneByConditions(conditions: any): Promise<FriendRequest | null> {
    const where: any = {};
    if (conditions.fromUserId) where.fromUser = { id: conditions.fromUserId };
    if (conditions.toUserId) where.toUser = { id: conditions.toUserId };
    if (conditions.status) where.status = conditions.status;

    return this.repo.findOne({
      where,
      relations: ['fromUser', 'toUser'],
    });
  }

  async getFriends(userId: string): Promise<User[]> {
    const acceptedRequests = await this.repo
      .createQueryBuilder('fr')
      .leftJoinAndSelect('fr.fromUser', 'fromUser')
      .leftJoinAndSelect('fr.toUser', 'toUser')
      .where('fr.status = :status', { status: 'accepted' })
      .andWhere('(fr.fromUser.id = :userId OR fr.toUser.id = :userId)', {
        userId,
      })
      .getMany();

    const friends: User[] = [];

    acceptedRequests.forEach((req) => {
      if (req.fromUser?.id === userId && req.toUser) {
        friends.push(req.toUser);
      } else if (req.toUser?.id === userId && req.fromUser) {
        friends.push(req.fromUser);
      }
    });

    const unique = friends.filter((u): u is User => !!u && !!u.id);
    const map = new Map(unique.map((u) => [u.id, u]));
    return Array.from(map.values());
  }

  async isFriend(userId1: string, userId2: string): Promise<boolean> {
    return this.repo
      .createQueryBuilder('fr')
      .where(
        '(fr.fromUser.id = :userId1 AND fr.toUser.id = :userId2) OR (fr.fromUser.id = :userId2 AND fr.toUser.id = :userId1)',
        { userId1, userId2 },
      )
      .andWhere('fr.status = :status', { status: 'accepted' })
      .getExists();
  }

  async removeFriendship(userId1: string, userId2: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .delete()
      .from(FriendRequest)
      .where(
        '(fromUser.id = :userId1 AND toUser.id = :userId2) OR (fromUser.id = :userId2 AND toUser.id = :userId1)',
        { userId1, userId2 },
      )
      .andWhere('status = :status', { status: 'accepted' })
      .execute();
  }
}

export const friendRequestRepository = new FriendRequestRepository();
