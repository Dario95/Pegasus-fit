import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Aparición al hacer scroll (estilo Apple): el elemento entra con fade + lift
 * la primera vez que cruza el viewport. Uso: <div aparece style="transition-delay:120ms">
 */
@Directive({ selector: '[aparece]' })
export class Aparece implements OnInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private obs?: IntersectionObserver;

  ngOnInit(): void {
    const node = this.el.nativeElement;
    node.classList.add('pre-aparece');
    this.obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            node.classList.add('aparecido');
            this.obs?.unobserve(node);
          }
        }
      },
      { threshold: 0.18 },
    );
    this.obs.observe(node);
  }

  ngOnDestroy(): void {
    this.obs?.disconnect();
  }
}
