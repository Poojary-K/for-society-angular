import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChatService } from '../services/chat.service';
import { ToastService } from '../../../core/services/toast.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { ChatSession, ChatMessage } from '../models/chat.model';
import { ChatSessionListComponent } from '../chat-session-list/chat-session-list.component';
import { ChatMessageListComponent } from '../chat-message-list/chat-message-list.component';
import { ChatInputComponent } from '../chat-input/chat-input.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatSessionListComponent, ChatMessageListComponent, ChatInputComponent],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent implements OnInit, OnDestroy, AfterViewChecked {
  private chatService = inject(ChatService);
  private toast = inject(ToastService);
  private sidebarService = inject(SidebarService);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLElement>;

  sessions = signal<ChatSession[]>([]);
  activeSessionId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);
  isLoading = signal<boolean>(false);
  sidebarOpen = signal<boolean>(false);
  agentAvailable = signal<boolean>(true);
  agentDown = computed(() => !this.agentAvailable());

  streamingText = signal<string>('');
  streamingTools = signal<string[]>([]);

  private healthInterval?: ReturnType<typeof setInterval>;
  private streamSubscription?: Subscription;

  private shouldScroll = false;
  private readonly sidebarHandle = { toggle: () => this.toggleSidebar() };

  ngOnInit(): void {
    this.loadSessions(true);
    this.sidebarService.registerSidebar(this.sidebarHandle);
    this.pollAgentHealth();
    this.healthInterval = setInterval(() => this.pollAgentHealth(), 60_000);
  }

  ngOnDestroy(): void {
    this.sidebarService.unregisterSidebar(this.sidebarHandle);
    clearInterval(this.healthInterval);
    this.streamSubscription?.unsubscribe();
  }

  private pollAgentHealth(): void {
    this.chatService.getAgentHealth().subscribe({
      next: ({ available }) => this.agentAvailable.set(available),
      error: () => this.agentAvailable.set(false),
    });
  }

  onInputAreaClick(): void {
    if (this.agentDown()) {
      this.toast.error('AI assistant is currently unavailable. Please try again later.');
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  private loadSessions(selectFirst = false): void {
    this.chatService.listSessions().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        if (selectFirst && sessions.length > 0 && this.activeSessionId() === null) {
          this.selectSession(sessions[0].sessionId);
        }
      },
      error: () => this.toast.error('Failed to load chats'),
    });
  }

  selectSession(sessionId: number): void {
    this.activeSessionId.set(sessionId);
    this.sidebarOpen.set(false);
    this.chatService.getSession(sessionId).subscribe({
      next: (data) => {
        this.messages.set(data.messages);
        this.shouldScroll = true;
      },
      error: () => this.toast.error('Failed to load conversation'),
    });
  }

  createNewSession(): void {
    this.activeSessionId.set(null);
    this.messages.set([]);
    this.sidebarOpen.set(false);
  }

  deleteSession(sessionId: number): void {
    if (!confirm('Delete this chat? This cannot be undone.')) {
      return;
    }
    this.chatService.archiveSession(sessionId).subscribe({
      next: () => {
        this.sessions.set(this.sessions().filter((s) => s.sessionId !== sessionId));
        if (this.activeSessionId() === sessionId) {
          this.createNewSession();
        }
        this.toast.success('Chat deleted');
      },
      error: () => this.toast.error('Failed to delete chat'),
    });
  }

  onSend(content: string): void {
    const activeId = this.activeSessionId();
    if (activeId === null) {
      this.chatService.createSession().subscribe({
        next: (session) => {
          this.sessions.set([session, ...this.sessions()]);
          this.activeSessionId.set(session.sessionId);
          this.dispatchMessage(session.sessionId, content);
        },
        error: () => this.toast.error('Failed to start chat'),
      });
      return;
    }
    this.dispatchMessage(activeId, content);
  }

  private dispatchMessage(sessionId: number, content: string): void {
    const optimistic: ChatMessage = {
      messageId: -Date.now(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    this.messages.set([...this.messages(), optimistic]);
    this.isLoading.set(true);
    this.streamingText.set('');
    this.streamingTools.set([]);
    this.shouldScroll = true;

    this.streamSubscription?.unsubscribe();
    this.streamSubscription = this.chatService.streamMessage(sessionId, content).subscribe({
      next: (event) => {
        if (event.type === 'tool_start' && event.toolName) {
          this.streamingTools.update((tools) => [...tools, event.toolName!]);
          this.shouldScroll = true;
        } else if (event.type === 'token' && event.text) {
          this.streamingText.update((t) => t + event.text);
          this.shouldScroll = true;
        } else if (event.type === 'done' && event.userMessage && event.assistantMessage) {
          this.messages.set([
            ...this.messages().filter((m) => m.messageId !== optimistic.messageId),
            event.userMessage,
            event.assistantMessage,
          ]);
          this.streamingText.set('');
          this.streamingTools.set([]);
          this.isLoading.set(false);
          this.shouldScroll = true;
          this.loadSessions();
        } else if (event.type === 'error') {
          this.clearStreamingState(optimistic.messageId);
          this.toast.error('Failed to get a reply');
        }
      },
      error: (err) => {
        this.clearStreamingState(optimistic.messageId);
        const message = err?.status === 429 ? 'Too many requests. Please wait a moment.' : 'Failed to get a reply';
        this.toast.error(message);
      },
      complete: () => {
        // Safety net in case done event was missing.
        this.isLoading.set(false);
        this.streamingText.set('');
        this.streamingTools.set([]);
      },
    });
  }

  private clearStreamingState(optimisticId: number): void {
    this.messages.set(this.messages().filter((m) => m.messageId !== optimisticId));
    this.streamingText.set('');
    this.streamingTools.set([]);
    this.isLoading.set(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }
}
