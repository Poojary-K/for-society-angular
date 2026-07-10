import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage, PendingTask } from '../models/chat.model';
import { ChatService } from '../services/chat.service';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

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

  private chatService = inject(ChatService);
  private toolLabels: Record<string, string> = {};

  ngOnInit(): void {
    this.chatService.getToolLabels().subscribe((labels) => (this.toolLabels = labels));
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
