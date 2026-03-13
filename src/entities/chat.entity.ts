import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, default: 'private' })
  type!: 'private' | 'group';

  @Column({ nullable: true })
  name?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'creator_id' })
  creator?: User;

  @Column({ nullable: true })
  creator_id?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Message, (message) => message.chat)
  messages!: Message[];

  @ManyToMany(() => User, (user) => user.chats)
  @JoinTable({
    name: 'chat_participants',
    joinColumn: { name: 'chat_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  participants!: User[];
}
