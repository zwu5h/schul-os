import "server-only";
import type { ChatMessage, LLMProvider } from "./llm";
export class GroqProvider implements LLMProvider {
  id = "groq";
  constructor(
    private key: string,
    private model = process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  ) {}
  models() {
    return [
      { id: this.model, name: this.model, freeTier: true, vision: false },
    ];
  }
  private async request(
    messages: ChatMessage[],
    stream: boolean,
    signal?: AbortSignal,
  ) {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream,
          max_completion_tokens: 2048,
          temperature: 0.5,
        }),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(60000)])
          : AbortSignal.timeout(60000),
      },
    );
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "Das kostenlose Groq-Kontingent ist gerade erschöpft. Bitte versuche es später erneut."
          : response.status === 401
            ? "Der Groq-Schlüssel ist ungültig. Bitte prüfe die Server-Konfiguration."
            : "Groq ist gerade nicht erreichbar oder das Modell ist nicht verfügbar.",
      );
    return response;
  }
  async chat(messages: ChatMessage[], signal?: AbortSignal) {
    const data = await (await this.request(messages, false, signal)).json();
    return data.choices[0].message.content as string;
  }
  async stream(messages: ChatMessage[], signal?: AbortSignal) {
    const response = await this.request(messages, true, signal);
    if (!response.body) throw new Error("Groq hat keine Antwort geliefert.");
    return response.body;
  }
}
