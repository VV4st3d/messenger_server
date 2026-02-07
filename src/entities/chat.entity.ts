import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
    JoinTable,
    OneToMany,
} from "typeorm";
import { User } from "./user.entity";
import { Message } from "./message.entity";

@Entity("chats")
export class Chat {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", length: 20 })
    type!: "private" | "group";

    @Column({ type: "varchar", length: 100, nullable: true })
    name?: string; 

    @ManyToMany(() => User, (user) => user.chats, { cascade: true })
    @JoinTable({
        name: "chat_participants", 
        joinColumn: {
            name: "chat_id",
            referencedColumnName: "id",
        },
        inverseJoinColumn: {
            name: "user_id",
            referencedColumnName: "id",
        },
    })
    participants!: User[];

    @OneToMany(() => Message, (message) => message.chat, { cascade: true })
    messages!: Message[];

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
