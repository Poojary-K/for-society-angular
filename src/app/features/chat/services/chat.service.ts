import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { ApiResponse } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { ChatSession, ChatMessage, SendMessageResponse, AgentHealth, StreamEvent, StreamEventType, ToolMeta, SessionPendingState, PendingTask, PendingActionResponse } from '../models/chat.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/chat`;
  private toolLabels$?: Observable<Record<string, string>>;

  /**
   * Fetches the tool name → progress-label map from the API (cached for the
   * session). The UI uses this instead of hardcoding labels that drift from
   * the backend tool catalog.
   */
  getToolLabels(): Observable<Record<string, string>> {
    if (!this.toolLabels$) {
      this.toolLabels$ = this.http
        .get<ApiResponse<{ tools: ToolMeta[] }>>(`${this.baseUrl}/tools`)
        .pipe(
          map((response) => Object.fromEntries(response.data.tools.map((t) => [t.name, t.label]))),
          shareReplay(1),
        );
    }
    return this.toolLabels$;
  }

  getAgentHealth(): Observable<AgentHealth> {
    return this.http
      .get<ApiResponse<AgentHealth>>(`${this.baseUrl}/health`)
      .pipe(map((response) => response.data));
  }

  createSession(title?: string): Observable<ChatSession> {
    return this.http
      .post<ApiResponse<ChatSession>>(`${this.baseUrl}/sessions`, title ? { title } : {})
      .pipe(map((response) => response.data));
  }

  listSessions(): Observable<ChatSession[]> {
    return this.http
      .get<ApiResponse<{ sessions: ChatSession[] }>>(`${this.baseUrl}/sessions`)
      .pipe(map((response) => response.data.sessions));
  }

  getSession(sessionId: number): Observable<{ session: ChatSession; messages: ChatMessage[] }> {
    return this.http
      .get<ApiResponse<{ session: ChatSession; messages: ChatMessage[] }>>(`${this.baseUrl}/sessions/${sessionId}`)
      .pipe(map((response) => response.data));
  }

  getSessionPending(sessionId: number): Observable<SessionPendingState> {
    return this.http
      .get<ApiResponse<SessionPendingState>>(`${this.baseUrl}/sessions/${sessionId}/pending`)
      .pipe(map((response) => response.data));
  }

  confirmSessionPending(sessionId: number): Observable<PendingActionResponse> {
    return this.http
      .post<ApiResponse<PendingActionResponse>>(`${this.baseUrl}/sessions/${sessionId}/pending/confirm`, {})
      .pipe(map((response) => response.data));
  }

  cancelSessionPending(sessionId: number): Observable<PendingActionResponse> {
    return this.http
      .post<ApiResponse<PendingActionResponse>>(`${this.baseUrl}/sessions/${sessionId}/pending/cancel`, {})
      .pipe(map((response) => response.data));
  }

  archiveSession(sessionId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/sessions/${sessionId}`)
      .pipe(map(() => undefined));
  }

  sendMessage(sessionId: number, content: string): Observable<SendMessageResponse> {
    return this.http
      .post<ApiResponse<SendMessageResponse>>(`${this.baseUrl}/sessions/${sessionId}/messages`, { content })
      .pipe(map((response) => response.data));
  }

  /**
   * Sends a message and streams the response as SSE events via fetch ReadableStream.
   * Emits tool_start events as tools fire, token events as text arrives,
   * and a final done event with the persisted message DTOs.
   */
  streamMessage(sessionId: number, content: string): Observable<StreamEvent> {
    const token = this.authService.getToken();
    const url = `${this.baseUrl}/sessions/${sessionId}/messages/stream`;

    return new Observable<StreamEvent>((observer) => {
      const controller = new AbortController();

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            observer.error({ status: response.status });
            return;
          }
          if (!response.body) {
            observer.error(new Error('No response body'));
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              buffer = parts.pop() ?? '';

              for (const part of parts) {
                const lines = part.split('\n');
                let eventType = 'message';
                let dataStr = '';
                for (const line of lines) {
                  if (line.startsWith('event:')) eventType = line.slice(6).trim();
                  else if (line.startsWith('data:')) dataStr = line.slice(5).trim();
                }
                if (dataStr) {
                  try {
                    const parsed = JSON.parse(dataStr) as Record<string, unknown>;
                    observer.next({ type: eventType as StreamEventType, ...parsed } as StreamEvent);
                  } catch { /* ignore malformed chunks */ }
                }
              }
            }
            observer.complete();
          } catch (err) {
            if ((err as Error).name !== 'AbortError') observer.error(err);
            else observer.complete();
          }
        })
        .catch((err: Error) => {
          if (err.name !== 'AbortError') observer.error(err);
        });

      return () => controller.abort();
    });
  }
}
