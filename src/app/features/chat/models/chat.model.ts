export interface ChatSession {
  sessionId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  messageId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  toolsUsed?: string[];
}

export interface AgentHealth {
  available: boolean;
}
