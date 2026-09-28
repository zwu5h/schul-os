export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface Model {
  id: string;
  name: string;
  freeTier: boolean;
  vision: boolean;
}
export interface LLMProvider {
  id: string;
  chat(messages: ChatMessage[], signal?: AbortSignal): Promise<string>;
  stream(
    messages: ChatMessage[],
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>>;
  vision?: (messages: ChatMessage[], images: string[]) => Promise<string>;
  embeddings?: (texts: string[]) => Promise<number[][]>;
  models(): Model[];
}
