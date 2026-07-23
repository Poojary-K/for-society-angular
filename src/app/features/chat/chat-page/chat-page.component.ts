import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChatService } from '../services/chat.service';
import { ToastService } from '../../../core/services/toast.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { ChatSession, ChatMessage, SessionPendingState } from '../models/chat.model';
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
  @ViewChild(ChatInputComponent) private chatInput?: ChatInputComponent;

  sessions = signal<ChatSession[]>([]);
  activeSessionId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);
  isLoading = signal<boolean>(false);
  sidebarOpen = signal<boolean>(false);
  agentAvailable = signal<boolean>(true);
  agentStatus = signal<'available' | 'busy' | 'unavailable'>('available');
  agentStatusMessage = signal<string | null>(null);
  agentDown = computed(() => !this.agentAvailable());
  agentBusy = computed(() => this.agentStatus() === 'busy');

  streamingText = signal<string>('');
  streamingTools = signal<string[]>([]);
  pendingState = signal<SessionPendingState | null>(null);
  pendingActionLoading = signal<boolean>(false);

  private healthInterval?: ReturnType<typeof setInterval>;
  private streamSubscription?: Subscription;

  /** Session that owns the in-flight SSE (may differ from activeSessionId while backgrounded). */
  private streamSessionId: number | null = null;
  private streamOptimistic: ChatMessage | null = null;
  private streamText = '';
  private streamTools: string[] = [];
  private streamLoading = false;

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
    this.abortStream();
  }

  private pollAgentHealth(): void {
    this.chatService.getAgentHealth().subscribe({
      next: (health) => {
        this.agentAvailable.set(health.available);
        this.agentStatus.set(health.status ?? (health.available ? 'available' : 'unavailable'));
        this.agentStatusMessage.set(health.message ?? null);
      },
      error: () => {
        this.agentAvailable.set(false);
        this.agentStatus.set('unavailable');
        this.agentStatusMessage.set('The AI assistant is temporarily unavailable.');
      },
    });
  }

  onInputAreaClick(): void {
    if (this.agentBusy()) {
      this.toast.error(
        this.agentStatusMessage() ??
          'The AI service is currently busy. Please wait a moment and try again.',
      );
      return;
    }
    if (this.agentDown()) {
      this.toast.error(
        this.agentStatusMessage() ?? 'AI assistant is currently unavailable. Please try again later.',
      );
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
    this.syncDisplayedStreaming(sessionId);

    this.chatService.getSession(sessionId).subscribe({
      next: (data) => {
        if (this.activeSessionId() !== sessionId) {
          return;
        }
        this.messages.set(this.mergeStreamOptimistic(sessionId, data.messages));
        this.syncDisplayedStreaming(sessionId);
        this.shouldScroll = true;
      },
      error: () => this.toast.error('Failed to load conversation'),
    });
    this.loadPendingState(sessionId);
  }

  private loadPendingState(sessionId: number): void {
    this.chatService.getSessionPending(sessionId).subscribe({
      next: (state) => {
        if (this.activeSessionId() === sessionId) {
          this.pendingState.set(state);
        }
      },
      error: () => {
        if (this.activeSessionId() === sessionId) {
          this.pendingState.set(null);
        }
      },
    });
  }

  onConfirmPending(): void {
    const sessionId = this.activeSessionId();
    if (sessionId === null || this.pendingActionLoading()) {
      return;
    }
    this.pendingActionLoading.set(true);
    this.chatService.confirmSessionPending(sessionId).subscribe({
      next: (result) => {
        this.messages.set([...this.messages(), result.assistantMessage]);
        this.pendingState.set(result.pending);
        this.pendingActionLoading.set(false);
        this.shouldScroll = true;
      },
      error: (err) => {
        this.pendingActionLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to confirm action');
      },
    });
  }

  onCancelPending(): void {
    const sessionId = this.activeSessionId();
    if (sessionId === null || this.pendingActionLoading()) {
      return;
    }
    this.pendingActionLoading.set(true);
    this.chatService.cancelSessionPending(sessionId).subscribe({
      next: (result) => {
        this.messages.set([...this.messages(), result.assistantMessage]);
        this.pendingState.set(result.pending);
        this.pendingActionLoading.set(false);
        this.shouldScroll = true;
      },
      error: (err) => {
        this.pendingActionLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to cancel action');
      },
    });
  }

  createNewSession(): void {
    this.activeSessionId.set(null);
    this.messages.set([]);
    this.pendingState.set(null);
    this.sidebarOpen.set(false);
    this.clearDisplayedStreaming();
  }

  deleteSession(sessionId: number): void {
    if (!confirm('Delete this chat? This cannot be undone.')) {
      return;
    }
    this.chatService.archiveSession(sessionId).subscribe({
      next: () => {
        if (this.streamSessionId === sessionId) {
          this.abortStream();
        }
        this.sessions.set(this.sessions().filter((s) => s.sessionId !== sessionId));
        if (this.activeSessionId() === sessionId) {
          this.createNewSession();
        }
        this.toast.success('Chat deleted');
      },
      error: () => this.toast.error('Failed to delete chat'),
    });
  }

  onSuggestionSelect(prompt: string): void {
    // Prefill the input bar with the example prompt; the user chooses to send.
    this.chatInput?.fill(prompt);
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
    this.streamSubscription?.unsubscribe();

    const optimistic: ChatMessage = {
      messageId: -Date.now(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    this.streamSessionId = sessionId;
    this.streamOptimistic = optimistic;
    this.streamText = '';
    this.streamTools = [];
    this.streamLoading = true;

    this.messages.set([...this.messages(), optimistic]);
    this.paintStreamFromBuffer();
    this.shouldScroll = true;

    this.streamSubscription = this.chatService.streamMessage(sessionId, content).subscribe({
      next: (event) => {
        if (event.type === 'tool_start' && event.toolName) {
          this.streamTools = [...this.streamTools, event.toolName];
          if (this.isStreamVisible(sessionId)) {
            this.streamingTools.set([...this.streamTools]);
            this.shouldScroll = true;
          }
        } else if (event.type === 'token' && event.text) {
          this.streamText += event.text;
          if (this.isStreamVisible(sessionId)) {
            this.streamingText.set(this.streamText);
            this.shouldScroll = true;
          }
        } else if (event.type === 'done' && event.userMessage && event.assistantMessage) {
          this.clearStreamBuffer();
          this.loadSessions();
          this.pollAgentHealth();

          if (this.activeSessionId() === sessionId) {
            this.messages.set([
              ...this.messages().filter((m) => m.messageId !== optimistic.messageId),
              event.userMessage,
              event.assistantMessage,
            ]);
            this.clearDisplayedStreaming();
            this.shouldScroll = true;
            if (event.pendingTask !== undefined) {
              this.pendingState.set({
                active: event.pendingTask,
                recentlySuperseded: this.pendingState()?.recentlySuperseded ?? [],
              });
            } else {
              this.loadPendingState(sessionId);
            }
          }
        } else if (event.type === 'error') {
          this.toast.error(event.message ?? 'Failed to get a reply');
          this.pollAgentHealth();
        }
      },
      error: (err) => {
        const wasVisible = this.activeSessionId() === sessionId;
        this.clearStreamBuffer();
        if (wasVisible) {
          this.messages.set(this.messages().filter((m) => m.messageId !== optimistic.messageId));
          this.clearDisplayedStreaming();
        }
        let message = 'Failed to get a reply';
        if (err?.status === 429) {
          message = 'Too many requests. Please wait a moment.';
        } else if (err?.status === 503) {
          message = 'The AI service is currently busy. Please wait a moment and try again.';
        } else if (typeof err?.message === 'string' && err.message.length > 0) {
          message = err.message;
        }
        this.toast.error(message);
        this.pollAgentHealth();
      },
      complete: () => {
        // Safety net if done event was missing.
        if (this.streamSessionId === sessionId) {
          this.clearStreamBuffer();
          if (this.activeSessionId() === sessionId) {
            this.clearDisplayedStreaming();
          }
        }
      },
    });
  }

  private isStreamVisible(sessionId: number): boolean {
    return this.streamSessionId === sessionId && this.activeSessionId() === sessionId;
  }

  private syncDisplayedStreaming(sessionId: number): void {
    if (this.streamSessionId === sessionId && this.streamLoading) {
      this.paintStreamFromBuffer();
    } else {
      this.clearDisplayedStreaming();
    }
  }

  private mergeStreamOptimistic(sessionId: number, messages: ChatMessage[]): ChatMessage[] {
    if (
      this.streamSessionId !== sessionId ||
      !this.streamLoading ||
      !this.streamOptimistic
    ) {
      return messages;
    }
    const optimistic = this.streamOptimistic;
    // Server may already have the user turn; only append the local optimistic bubble if missing.
    const hasSameTail =
      messages.length > 0 &&
      messages[messages.length - 1].role === 'user' &&
      messages[messages.length - 1].content === optimistic.content;
    return hasSameTail ? messages : [...messages, optimistic];
  }

  private paintStreamFromBuffer(): void {
    this.streamingText.set(this.streamText);
    this.streamingTools.set([...this.streamTools]);
    this.isLoading.set(this.streamLoading);
  }

  private clearDisplayedStreaming(): void {
    this.streamingText.set('');
    this.streamingTools.set([]);
    this.isLoading.set(false);
  }

  private clearStreamBuffer(): void {
    this.streamSessionId = null;
    this.streamOptimistic = null;
    this.streamText = '';
    this.streamTools = [];
    this.streamLoading = false;
  }

  private abortStream(): void {
    this.streamSubscription?.unsubscribe();
    this.streamSubscription = undefined;
    this.clearStreamBuffer();
    this.clearDisplayedStreaming();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }
}
