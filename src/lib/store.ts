let idCounter = 0;

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  ts: number;
}

const messages: ChatMessage[] = [];

export function getMessages(limit = 50): ChatMessage[] {
  return messages.slice(-limit);
}

export function addMessage(from: string, text: string): ChatMessage {
  const msg: ChatMessage = { id: String(++idCounter), from, text, ts: Date.now() };
  messages.push(msg);
  return msg;
}

export function messageCount(): number {
  return messages.length;
}
