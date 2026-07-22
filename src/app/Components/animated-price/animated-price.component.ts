import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-animated-price',
  templateUrl: './animated-price.component.html',
  styleUrls: ['./animated-price.component.scss'],
})
export class AnimatedPriceComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value = 0;
  @Input() currency = 'LE';
  @ViewChild('amount', { static: true }) amountRef!: ElementRef<HTMLElement>;
  @ViewChild('root', { static: true }) root!: ElementRef<HTMLElement>;

  private observer?: IntersectionObserver;
  private rafId = 0;
  private played = false;
  private reduced = false;

  constructor(private zone: NgZone) {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['value']) return;
    if (this.reduced || !this.played) {
      this.setAmount(Math.round(this.value));
      return;
    }
    this.played = false;
    this.setAmount(0);
    this.zone.runOutsideAngular(() => this.checkInViewAndPlay());
  }

  ngAfterViewInit(): void {
    this.setAmount(this.reduced ? Math.round(this.value) : 0);
    if (this.reduced) return;

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          this.play();
          this.observer?.disconnect();
        },
        { root: null, rootMargin: '0px', threshold: 0.15 }
      );
      this.observer.observe(this.root.nativeElement);
      requestAnimationFrame(() => this.checkInViewAndPlay());
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private checkInViewAndPlay(): void {
    if (this.played || this.reduced) return;
    const rect = this.root.nativeElement.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) this.play();
  }

  private play(): void {
    if (this.played || this.reduced) return;
    this.played = true;

    const end = Math.round(this.value);
    const start = performance.now();
    const duration = 700;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.setAmount(Math.round(end * eased));
      if (t < 1) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.setAmount(end);
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private setAmount(n: number): void {
    if (this.amountRef?.nativeElement) {
      this.amountRef.nativeElement.textContent = String(n);
    }
  }
}
