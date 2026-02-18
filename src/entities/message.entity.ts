import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Chat } from './chat.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat!: Chat;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sender_id' })
  sender!: User;

  @Column({ nullable: true })
  senderId!: string;

  @Column('text')
  content!: string;

  @Column({ default: 'text' })
  type!: 'text' | 'image' | 'file' | 'system' | 'ai_generated';

  @Column({ default: false })
  isRead!: boolean;

  @Column({ nullable: true })
  replyToId?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'tsvector', select: false })
  searchVector!: any;

  @Column({ default: false })
  isPinned!: boolean;

  @Column({ nullable: true })
  filePath?: string;

  @Column({ nullable: true })
  fileType?: string;

  @Column({ nullable: true })
  fileSize?: number;
}
