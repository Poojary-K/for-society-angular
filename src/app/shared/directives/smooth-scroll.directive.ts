import { Directive, HostListener, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appSmoothScroll]',
  standalone: true,
})
export class SmoothScrollDirective {
  private el = inject(ElementRef);

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const href = target.getAttribute('href');
    
    if (href && href.startsWith('#')) {
      event.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }
  }
}

