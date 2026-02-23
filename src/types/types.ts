export type SendMessageData = {
  chatId: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'system' | 'ai_generated' | 'sticker';
};
