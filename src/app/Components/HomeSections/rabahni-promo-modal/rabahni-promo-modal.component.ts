import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { EMPTY, Subject, timer } from 'rxjs';
import { filter, startWith, switchMap, takeUntil } from 'rxjs/operators';
import gsap from 'gsap';
import { LanguageService } from 'src/app/services/language.service';

const SHOW_DELAY_MS = 3000;
const DURATION_MS = 15000;
const DOWNLOAD_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const SEEN_KEY = 'rabahni-promo-seen';
const SNOOZE_KEY = 'rabahni-promo-snooze-until';
const FORCE_PARAM = 'rabahni';
const PLAY_URL = 'https://play.google.com/store/apps/details?id=hendal.rabhny.mazad';
const APP_STORE_URL = 'https://apps.apple.com/eg/app/%D8%B1%D8%A8%D8%AD%D9%86%D9%8A/id6813184088';

@Component({
  selector: 'app-rabahni-promo-modal',
  templateUrl: './rabahni-promo-modal.component.html',
  styleUrls: ['./rabahni-promo-modal.component.scss']
})
export class RabahniPromoModalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root') rootRef?: ElementRef<HTMLElement>;

  open = false;
  remaining = Math.ceil(DURATION_MS / 1000);
  shotIndex = 0;
  readonly durationSec = DURATION_MS / 1000;
  readonly circumference = 2 * Math.PI * 18;
  readonly playUrl = PLAY_URL;
  readonly appStoreUrl = APP_STORE_URL;
  readonly qrSrc = 'assets/rabahni/qr.jpg';
  readonly appleIcon = 'assets/apple.png';
  readonly playIcon = 'assets/google_play1-removebg-preview.png';
  readonly shots = [
    'assets/rabahni/splash@2x.jpg',
    'assets/rabahni/auctions@2x.jpg',
    'assets/rabahni/win@2x.jpg'
  ];
  readonly confetti = Array.from({ length: 16 }, (_, i) => i);
  readonly floats = [{ key: 'win' }, { key: 'live' }, { key: 'coupon' }];

  private destroy$ = new Subject<void>();
  private ctx?: gsap.Context;
  private tick?: ReturnType<typeof setInterval>;
  private shotTick?: ReturnType<typeof setInterval>;
  private deadline = 0;

  constructor(
    private router: Router,
    public languageService: LanguageService
  ) {}

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  get dashOffset(): number {
    const t = this.remaining / this.durationSec;
    return this.circumference * (1 - Math.max(0, Math.min(1, t)));
  }

  ngAfterViewInit(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        startWith(null),
        switchMap(() => (this.isHome() ? timer(SHOW_DELAY_MS) : EMPTY)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (!this.open && this.shouldShow()) this.reveal();
      });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.open && !this.isHome()) this.hide();
      });
  }

  get secondsLabel(): string {
    return `${Math.max(0, this.remaining)}s`;
  }

  download(): void {
    this.goToStore(this.storeForDevice());
  }

  openStore(url: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.goToStore(url);
  }

  learnMore(): void {
    this.goToStore(this.storeForDevice());
  }

  dismiss(): void {
    if (!this.open) return;
    this.stopTick();

    const root = this.rootRef?.nativeElement;
    const card = root?.querySelector('.rabahni-card');
    if (!root || !card || this.prefersReduced()) {
      this.hide();
      return;
    }

    gsap.to(card, {
      opacity: 0,
      y: 16,
      scale: 0.96,
      duration: 0.28,
      ease: 'power2.in'
    });
    const fallback = setTimeout(() => this.hide(), 450);
    gsap.to(root, {
      opacity: 0,
      duration: 0.28,
      ease: 'power1.in',
      onComplete: () => {
        clearTimeout(fallback);
        this.hide();
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open) this.dismiss();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTick();
    this.ctx?.revert();
    this.lockScroll(false);
  }

  private lockScroll(on: boolean): void {
    document.body.classList.toggle('rabahni-promo-open', on);
    document.documentElement.classList.toggle('rabahni-promo-open', on);
  }

  private storeForDevice(): string {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? this.appStoreUrl : this.playUrl;
  }

  private goToStore(url: string): void {
    window.open(url, '_blank', 'noopener');
    this.store(localStorage, SNOOZE_KEY, String(Date.now() + DOWNLOAD_SNOOZE_MS));
    this.dismiss();
  }

  private shouldShow(): boolean {
    if (this.isForced()) return true;
    if (this.read(sessionStorage, SEEN_KEY)) return false;
    const snoozeUntil = Number(this.read(localStorage, SNOOZE_KEY) || 0);
    return Date.now() >= snoozeUntil;
  }

  private isForced(): boolean {
    return new URLSearchParams(window.location.search).get(FORCE_PARAM) === '1';
  }

  private read(storage: Storage, key: string): string | null {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  private store(storage: Storage, key: string, value: string): void {
    try {
      storage.setItem(key, value);
    } catch {}
  }

  private reveal(): void {
    this.open = true;
    this.shotIndex = 0;
    this.remaining = this.durationSec;
    this.deadline = Date.now() + DURATION_MS;
    this.lockScroll(true);
    if (!this.isForced()) this.store(sessionStorage, SEEN_KEY, '1');

    setTimeout(() => this.playIntro(), 20);
    this.tick = setInterval(() => {
      const left = Math.ceil((this.deadline - Date.now()) / 1000);
      this.remaining = Math.max(0, left);
      if (left <= 0) this.dismiss();
    }, 200);
    this.shotTick = setInterval(() => {
      this.shotIndex = (this.shotIndex + 1) % this.shots.length;
    }, 2600);
  }

  private playIntro(): void {
    const root = this.rootRef?.nativeElement;
    if (!root) return;
    this.ctx?.revert();
    this.ctx = gsap.context(() => {
      if (this.prefersReduced()) return;

      gsap.fromTo(
        root,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power1.out' }
      );
      gsap.fromTo(
        '.rabahni-card',
        { opacity: 0, y: 28, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.35)', clearProps: 'transform' }
      );
      gsap.fromTo(
        '.rabahni-device',
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, delay: 0.12, ease: 'power3.out', clearProps: 'transform' }
      );      gsap.fromTo(
        '.rabahni-float',
        { opacity: 0, y: 14, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, delay: 0.45, stagger: 0.14, ease: 'back.out(1.6)' }
      );
      gsap.to('.rabahni-float', {
        y: -6,
        duration: 2.2,
        delay: 1.1,
        yoyo: true,
        repeat: -1,
        stagger: 0.35,
        ease: 'sine.inOut'
      });
      gsap.fromTo(
        '.rabahni-confetti span',
        { y: -8, opacity: 0.9 },
        {
          y: 52,
          rotation: 160,
          opacity: 0,
          duration: 2.2,
          stagger: 0.12,
          repeat: -1,
          ease: 'none'
        }
      );
    }, root);
  }

  private hide(): void {
    this.stopTick();
    this.open = false;
    this.lockScroll(false);
    this.ctx?.revert();
    this.ctx = undefined;
  }

  private stopTick(): void {
    if (this.tick) {
      clearInterval(this.tick);
      this.tick = undefined;
    }
    if (this.shotTick) {
      clearInterval(this.shotTick);
      this.shotTick = undefined;
    }
  }

  private prefersReduced(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private isHome(): boolean {
    const url = this.router.url.split('?')[0].replace(/\/$/, '') || '/';
    return url === '/home' || url === '/';
  }
}
