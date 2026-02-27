import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Chat } from './chat.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50, unique: true })
  @Index()
  username!: string;

  @Column({ length: 120, unique: true })
  @Index()
  email!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ length: 100, nullable: true })
  displayName?: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastActive?: Date;

  @Column({ length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ length: 30, default: 'offline' })
  status!: string;

  @Column({ default: false })
  isOnline!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToMany(() => Chat, (chat) => chat.participants)
  chats!: Chat[];
  @Column({ type: 'text', nullable: true })
  bio?: string;
}
