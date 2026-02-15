import axios from 'axios';

export class AiService {
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private apiKey = process.env.OPENROUTER_API_KEY;
  private model = process.env.OPENROUTER_MODEL || 'openrouter/aurora-alpha';

  async generateResponse(
    userPrompt: string,
    context: string = '',
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY не задан в .env');
    }

    const summaryPrompt = `
Ты точный и лаконичный аналитик текста.
Сделай очень краткое содержание (максимум 3–4 предложения, 100–150 слов) следующего сообщения:
"${userPrompt}"

Правила:
- Только суть, без воды и эмоций.
- Не добавляй свои мысли, комментарии или вопросы.
- Пиши нейтрально и по делу.
- Если текст на русском — ответ тоже на русском.
`.trim();

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: summaryPrompt,
            },
          ],
          temperature: 0.5,
          reasoning: {
            enabled: true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Messenger Pet Project',
          },
        },
      );

      const content = response.data.choices[0].message.content.trim();

      const reasoning = response.data.choices[0].message.reasoning || '';
      if (reasoning) {
        console.log('[AI Summary Reasoning]:', reasoning);
      }

      return content;
    } catch (err: any) {
      console.error('OpenRouter error:', err.response?.data || err.message);
      return 'Не удалось сгенерировать содержание. Попробуй позже!';
    }
  }
}

export const aiService = new AiService();
