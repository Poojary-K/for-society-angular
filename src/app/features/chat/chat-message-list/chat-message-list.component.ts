import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage, PendingTask } from '../models/chat.model';
import { ChatService } from '../services/chat.service';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

export interface ChatPromptSuggestion {
  readonly label: string;
  readonly prompt: string;
}

@Component({
  selector: 'app-chat-message-list',
  standalone: true,
  imports: [CommonModule, MarkdownPipe],
  templateUrl: './chat-message-list.component.html',
  styleUrl: './chat-message-list.component.scss',
})
export class ChatMessageListComponent implements OnInit {
  @Input() messages: ChatMessage[] = [];
  @Input() loading = false;
  @Input() streamingText = '';
  @Input() streamingTools: string[] = [];
  @Input() pendingTask: PendingTask | null = null;
  @Input() pendingActionLoading = false;

  @Output() confirmPending = new EventEmitter<void>();
  @Output() cancelPending = new EventEmitter<void>();
  @Output() suggestionSelect = new EventEmitter<string>();

  readonly suggestions: ChatPromptSuggestion[] = [
    {
      label: 'Fund balance',
      prompt: 'What is the current fund balance?',
    },
    {
      label: 'My contributions',
      prompt: 'Show my contribution history',
    },
    {
      label: 'Single contribution',
      prompt: 'Make an entry for contribution of ₹5000 for Rajesh on July 10',
    },
    {
      label: 'Multiple contributions',
      prompt: 'Record contribution of ₹500 each for Shameer, Prinson, Anesh, and me for today',
    },
  ];

  private chatService = inject(ChatService);
  private toolLabels: Record<string, string> = {};

  ngOnInit(): void {
    this.chatService.getToolLabels().subscribe((labels) => (this.toolLabels = labels));
  }

  onSuggestionClick(prompt: string): void {
    if (this.loading) {
      return;
    }
    this.suggestionSelect.emit(prompt);
  }

  showPendingActions(message: ChatMessage): boolean {
    if (!this.pendingTask || message.role !== 'assistant') {
      return false;
    }
    const lastAssistant = [...this.messages].reverse().find((m) => m.role === 'assistant');
    return lastAssistant?.messageId === message.messageId;
  }

  toolLabel(name: string): string {
    return this.toolLabels[name] ?? name.replace(/_/g, ' ');
  }
}
