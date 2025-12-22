import { Directive, ElementRef, OnInit, OnDestroy, inject } from '@angular/core';

@Directive({
  selector: '[appScrollAnimation]',
  standalone: true,
})
export class ScrollAnimationDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      // Create intersection observer for scroll animations
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-in');
              // Keep observing in case element goes out and comes back in
            } else {
              // Optional: remove class when out of view for re-animation
              // entry.target.classList.remove('animate-in');
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -100px 0px', // Trigger earlier for better UX
        }
      );

      if (this.el.nativeElement) {
        this.observer.observe(this.el.nativeElement);
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}

