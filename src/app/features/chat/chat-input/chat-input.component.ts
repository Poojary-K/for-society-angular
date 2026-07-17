import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-input.component.html',
  styleUrl: './chat-input.component.scss',
})
export class ChatInputComponent {
  @Input() disabled = false;
  @Output() send = new EventEmitter<string>();

  @ViewChild('inputField') private inputField?: ElementRef<HTMLTextAreaElement>;

  draft = signal<string>('');

  /** Populate the input with the given text and focus it, without sending. */
  fill(content: string): void {
    this.draft.set(content);
    const el = this.inputField?.nativeElement;
    if (el) {
      el.focus();
      // Place the caret at the end of the prefilled text.
      const end = content.length;
      el.setSelectionRange(end, end);
    }
  }

  submit(): void {
    const content = this.draft().trim();
    if (!content || this.disabled) {
      return;
    }
    this.send.emit(content);
    this.draft.set('');
  }

  onKeydown(event: KeyboardEvent): void {
    // Enter sends; Shift+Enter inserts a newline.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }
}
