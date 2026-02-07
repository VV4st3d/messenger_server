import axios from "axios";

export class AiService {
    private apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    private apiKey = process.env.OPENROUTER_API_KEY;
    private model = process.env.OPENROUTER_MODEL || "xiaomi/mimo-v2-flash:free";

    async generateResponse(
        userPrompt: string,
        context: string = ""
    ): Promise<string> {
        if (!this.apiKey) {
            throw new Error("OPENROUTER_API_KEY не задан в .env");
        }

        const fullPrompt = `
Ты дружелюбный и остроумный собеседник в чате. 
Контекст предыдущих сообщений собеседника: 
${context || "Нет предыдущего контекста"}
Сейчас собеседник написал: "${userPrompt}"
Сгенерируй естественный, живой и короткий ответ от моего лица.
`;

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: [
                        {
                            role: "user",
                            content: fullPrompt,
                        },
                    ],
                    temperature: 0.8,
                    max_tokens: 300,
                    reasoning: {
                        enabled: true,
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "Messenger Pet Project",
                    },
                }
            );

            const content = response.data.choices[0].message.content.trim();

            const reasoning = response.data.choices[0].message.reasoning || "";
            if (reasoning) {
                console.log("[AI Reasoning]:", reasoning);
            }

            return content;
        } catch (err: any) {
            console.error(
                "OpenRouter error:",
                err.response?.data || err.message
            );
            return "Не удалось сгенерировать ответ. Попробуй позже!";
        }
    }
}

export const aiService = new AiService();
