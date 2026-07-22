import {
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';

/**
 * Lightweight 3D tilt on mousemove (Framer ProductCard style).
 * Runs outside Angular zone + rAF to avoid change-detection thrash.
 */
@Directive({
  selector: '[appProductCardTilt]',
})
export class ProductCardTiltDirective implements OnInit, OnDestroy {
  private card!: HTMLElement;
  private raf = 0;
  private enabled = false;
  private onMove = (e: MouseEvent) => this.queue(e);
  private onLeave = () => this.reset();

  constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngOnInit(): void {
    this.card = this.host.nativeElement;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduce || !fineHover) return;

    this.enabled = true;
    this.zone.runOutsideAngular(() => {
      this.card.addEventListener('mousemove', this.onMove, { passive: true });
      this.card.addEventListener('mouseleave', this.onLeave);
    });
  }

  ngOnDestroy(): void {
    if (!this.enabled) return;
    this.card.removeEventListener('mousemove', this.onMove);
    this.card.removeEventListener('mouseleave', this.onLeave);
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  private queue(e: MouseEvent): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.apply(e));
  }

  private apply(e: MouseEvent): void {
    const rect = this.card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rx = (-y * 8).toFixed(2);
    const ry = (x * 8).toFixed(2);

    this.card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    this.card.classList.add('product-card--tilting');
  }

  private reset(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.card.style.transform = '';
    this.card.classList.remove('product-card--tilting');
  }
}
