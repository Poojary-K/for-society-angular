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
    this.chatService.getSession(sessionId).subscribe({
      next: (data) => {
        this.messages.set(data.messages);
        this.shouldScroll = true;
      },
      error: () => this.toast.error('Failed to load conversation'),
    });
    this.loadPendingState(sessionId);
  }

  private loadPendingState(sessionId: number): void {
    this.chatService.getSessionPending(sessionId).subscribe({
      next: (state) => this.pendingState.set(state),
      error: () => this.pendingState.set(null),
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
          const activeId = this.activeSessionId();
          if (activeId !== null) {
            if (event.pendingTask !== undefined) {
              this.pendingState.set({
                active: event.pendingTask,
                recentlySuperseded: this.pendingState()?.recentlySuperseded ?? [],
              });
            } else {
              this.loadPendingState(activeId);
            }
          }
          this.pollAgentHealth();
        } else if (event.type === 'error') {
          this.toast.error(event.message ?? 'Failed to get a reply');
          this.pollAgentHealth();
        }
      },
      error: (err) => {
        this.clearStreamingState(optimistic.messageId);
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
