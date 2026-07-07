import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  private healthInterval?: ReturnType<typeof setInterval>;

  private shouldScroll = false;
  // While the chat page is mounted, the header's hamburger toggles this page's
  // session-list sidebar instead of the global nav sidebar (see SidebarService).
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
      // First message in a brand-new conversation: create the session, then send.
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
    // Optimistically show the user's message while the assistant replies.
    const optimistic: ChatMessage = {
      messageId: -Date.now(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    this.messages.set([...this.messages(), optimistic]);
    this.isLoading.set(true);
    this.shouldScroll = true;

    this.chatService.sendMessage(sessionId, content).subscribe({
      next: (response) => {
        this.messages.set([
          ...this.messages().filter((m) => m.messageId !== optimistic.messageId),
          response.userMessage,
          response.assistantMessage,
        ]);
        this.isLoading.set(false);
        this.shouldScroll = true;
        this.loadSessions();
      },
      error: (error) => {
        this.messages.set(this.messages().filter((m) => m.messageId !== optimistic.messageId));
        this.isLoading.set(false);
        const message = error?.status === 429 ? 'Too many requests. Please wait a moment.' : 'Failed to get a reply';
        this.toast.error(message);
      },
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }
}
