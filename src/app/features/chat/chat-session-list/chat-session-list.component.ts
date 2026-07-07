import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatSession } from '../models/chat.model';

@Component({
  selector: 'app-chat-session-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-session-list.component.html',
  styleUrl: './chat-session-list.component.scss',
})
export class ChatSessionListComponent {
  private router = inject(Router);

  @Input() sessions: ChatSession[] = [];
  @Input() activeSessionId: number | null = null;

  @Output() select = new EventEmitter<number>();
  @Output() create = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();

  onDelete(sessionId: number, event: Event): void {
    event.stopPropagation();
    this.delete.emit(sessionId);
  }

  goToMainNav(): void {
    this.router.navigate(['/feed']);
  }
}
