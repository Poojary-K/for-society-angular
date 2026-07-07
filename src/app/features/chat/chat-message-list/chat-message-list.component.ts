import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../models/chat.model';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-chat-message-list',
  standalone: true,
  imports: [CommonModule, MarkdownPipe],
  templateUrl: './chat-message-list.component.html',
  styleUrl: './chat-message-list.component.scss',
})
export class ChatMessageListComponent {
  @Input() messages: ChatMessage[] = [];
  @Input() loading = false;
}
