export interface ChatSession {
  sessionId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingTask {
  pendingId: number;
  actionType: string;
  payload: unknown;
  summary: string;
  status: string;
  expiresAt: string;
  supersededBy?: number;
}

export interface SessionPendingState {
  active: PendingTask | null;
  recentlySuperseded: Array<{
    pendingId: number;
    summary: string;
    supersededAt: string;
  }>;
}

export interface ChatMessage {
  messageId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  toolsUsed?: string[];
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  toolsUsed?: string[];
}

export interface AgentHealth {
  available: boolean;
  status?: 'available' | 'busy' | 'unavailable';
  message?: string;
}

export interface ToolMeta {
  name: string;
  label: string;
}

export type StreamEventType = 'tool_start' | 'token' | 'done' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  toolName?: string;
  text?: string;
  userMessage?: ChatMessage;
  assistantMessage?: ChatMessage;
  toolsUsed?: string[];
  pendingTask?: PendingTask | null;
  message?: string;
  status?: number;
}
