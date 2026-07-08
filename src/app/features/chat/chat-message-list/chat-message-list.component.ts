import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../models/chat.model';
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

  private chatService = inject(ChatService);
  private toolLabels: Record<string, string> = {};

  ngOnInit(): void {
    // Labels come from the backend tool catalog so the UI never drifts from it.
    this.chatService.getToolLabels().subscribe((labels) => (this.toolLabels = labels));
  }

  toolLabel(name: string): string {
    return this.toolLabels[name] ?? name.replace(/_/g, ' ');
  }
}
