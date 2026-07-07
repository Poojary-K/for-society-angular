import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked, Renderer } from 'marked';

@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  private renderer: Renderer;

  constructor(private sanitizer: DomSanitizer) {
    this.renderer = new Renderer();

    // Images: wrap in <a> so they're always clickable; show a text link when image fails to load
    this.renderer.image = ({ href, text }: { href: string; text: string; title?: string | null }) => {
      const alt = text || 'View image';
      const escaped = href.replace(/"/g, '&quot;');
      return `<figure class="md-img-figure">
        <a href="${escaped}" target="_blank" rel="noopener noreferrer">
          <img src="${escaped}" alt="${alt}"
               onerror="this.style.display='none';this.closest('figure').querySelector('.md-img-fallback').style.display='inline-flex'" />
        </a>
        <a class="md-img-fallback" href="${escaped}" target="_blank" rel="noopener noreferrer" style="display:none">
          &#128206; ${alt}
        </a>
      </figure>`;
    };

    // Links: always open in new tab
    this.renderer.link = ({ href, text }: { href: string; text: string; title?: string | null }) => {
      const escaped = href.replace(/"/g, '&quot;');
      return `<a href="${escaped}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };
  }

  transform(value: string): SafeHtml {
    const html = marked.parse(value, { async: false, renderer: this.renderer }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
