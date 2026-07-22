import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import gsap from 'gsap';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

/**
 * Port of React/Framer PageTransition:
 *
 * wipe:
 *   initial  { scaleX: 1 }          origin-left
 *   animate  { scaleX: 0 }          duration 0.55, ease [0.76, 0, 0.24, 1]
 *   exit     { scaleX: 1, originX: 1 }
 *
 * content:
 *   initial  { opacity: 0, y: 16 }
 *   animate  { opacity: 1, y: 0 }  duration 0.4, delay 0.25
 *   exit     { opacity: 0 }
 *
 * Sequenced like AnimatePresence mode="wait".
 */
const WIPE_EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';
const WIPE_DURATION = 0.35;
const CONTENT_DURATION = 0.25;
const CONTENT_DELAY = 0.12;

@Component({
  selector: 'app-page-transition',
  templateUrl: './page-transition.component.html',
  styleUrls: ['./page-transition.component.scss'],
})
export class PageTransitionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('wipe', { static: true }) wipeRef!: ElementRef<HTMLElement>;
  @ViewChild('content', { static: true }) contentRef!: ElementRef<HTMLElement>;

  private routerSub?: Subscription;
  private tween?: gsap.core.Timeline | gsap.core.Tween | gsap.core.Animation;
  private ready = false;
  private first = true;
  private gen = 0;
  private reduced = false;

  private routeReady: Promise<void> = Promise.resolve();
  private resolveRoute?: () => void;

  constructor(private router: Router) {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngAfterViewInit(): void {
    const wipe = this.wipeRef.nativeElement;

    // Resting state = Framer "animate" (open)
    gsap.set(wipe, {
      scaleX: 0,
      transformOrigin: 'left center',
      force3D: true,
    });
    this.settleContent();
    this.ready = true;

    if (this.router.navigated) {
      this.first = false;
    }

    this.routerSub = this.router.events
      .pipe(
        filter(
          (e) =>
            e instanceof NavigationStart ||
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError
        )
      )
      .subscribe((e) => {
        if (!this.ready || this.reduced) return;

        if (e instanceof NavigationStart) {
          if (this.first) return;

          this.routeReady = new Promise<void>((r) => {
            this.resolveRoute = r;
          });
          void this.run( ++this.gen );
          return;
        }

        if (e instanceof NavigationEnd) {
          if (this.first) {
            this.first = false;
            // Global preloader already covers first paint — keep content visible
            this.settleContent();
            gsap.set(wipe, { scaleX: 0, transformOrigin: 'left center', force3D: true });
            this.block(false);
            return;
          }
          this.resolveRoute?.();
          this.resolveRoute = undefined;
          return;
        }

        // cancel / error
        this.gen++;
        this.resolveRoute?.();
        this.resolveRoute = undefined;
        this.kill();
        this.block(false);
        gsap.set(wipe, { scaleX: 0, transformOrigin: 'left center' });
        this.settleContent();
        this.first = false;
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.kill();
    this.resolveRoute?.();
  }

  private kill(): void {
    this.tween?.kill();
    this.tween = undefined;
  }

  private block(on: boolean): void {
    this.wipeRef.nativeElement.classList.toggle('is-blocking', on);
  }

  /** AnimatePresence mode="wait": exit → wait route → enter */
  private async run(id: number): Promise<void> {
    const wipe = this.wipeRef.nativeElement;
    const content = this.contentRef.nativeElement;

    this.kill();
    this.block(true);

    // —— EXIT (Framer exit) ——
    // from resting scaleX:0 → scaleX:1, origin on the RIGHT
    gsap.set(wipe, {
      scaleX: Number(gsap.getProperty(wipe, 'scaleX')) || 0,
      transformOrigin: 'right center',
      force3D: true,
    });

    await this.play(
      gsap
        .timeline({ defaults: { force3D: true, overwrite: 'auto' } })
        .to(content, { opacity: 0, duration: CONTENT_DURATION * 0.6, ease: 'power1.out' }, 0)
        .to(
          wipe,
          {
            scaleX: 1,
            duration: WIPE_DURATION,
            ease: WIPE_EASE,
            transformOrigin: 'right center',
          },
          0
        )
    );
    if (id !== this.gen) return;

    // Page must be ready under the solid orange
    await this.routeReady;
    if (id !== this.gen) return;

    // —— ENTER (Framer initial → animate) ——
    // scaleX stays 1, switch origin to LEFT, then scaleX → 0
    gsap.set(wipe, {
      scaleX: 1,
      transformOrigin: 'left center',
      force3D: true,
    });
    gsap.set(content, { opacity: 0, y: 16, force3D: true });

    await this.play(
      gsap
        .timeline({ defaults: { force3D: true, overwrite: 'auto' } })
        .to(wipe, {
          scaleX: 0,
          duration: WIPE_DURATION,
          ease: WIPE_EASE,
          transformOrigin: 'left center',
        })
        .to(
          content,
          {
            opacity: 1,
            y: 0,
            duration: CONTENT_DURATION,
            ease: 'power2.out',
          },
          CONTENT_DELAY
        )
    );
    if (id !== this.gen) return;

    this.settleContent();
    this.block(false);
  }

  /** First load only — Framer initial → animate */
  private async enterOnly(id: number): Promise<void> {
    const wipe = this.wipeRef.nativeElement;
    const content = this.contentRef.nativeElement;

    this.kill();
    this.block(true);

    try {
      gsap.set(wipe, {
        scaleX: 1,
        transformOrigin: 'left center',
        force3D: true,
      });
      gsap.set(content, { opacity: 0, y: 16, force3D: true });

      await this.play(
        gsap
          .timeline({ defaults: { force3D: true, overwrite: 'auto' } })
          .to(wipe, {
            scaleX: 0,
            duration: WIPE_DURATION,
            ease: WIPE_EASE,
            transformOrigin: 'left center',
          })
          .to(
            content,
            {
              opacity: 1,
              y: 0,
              duration: CONTENT_DURATION,
              ease: 'power2.out',
            },
            CONTENT_DELAY
          )
      );
    } finally {
      if (id === this.gen) {
        this.settleContent();
        gsap.set(wipe, { scaleX: 0, transformOrigin: 'left center', force3D: true });
        this.block(false);
      }
    }
  }

  /** Clear transforms so position:sticky works in child pages */
  private settleContent(): void {
    const content = this.contentRef.nativeElement;
    gsap.set(content, { opacity: 1, clearProps: 'transform,translate,translateY' });
    content.style.transform = '';
  }

  private play(tl: gsap.core.Timeline): Promise<void> {
    this.tween = tl;
    return new Promise<void>((resolve) => {
      tl.eventCallback('onComplete', () => resolve());
      tl.eventCallback('onInterrupt', () => resolve());
    });
  }
}
