import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { ChatSession, ChatMessage, SendMessageResponse, AgentHealth } from '../models/chat.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/chat`;

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
}
