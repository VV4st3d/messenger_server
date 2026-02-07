import { Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { AppDataSource } from "../config/data-source";

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
}

export const userRepository = new UserRepository();
