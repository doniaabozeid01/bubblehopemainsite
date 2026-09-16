import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Subscription } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';

gsap.registerPlugin(ScrollTrigger);

interface ClockHour {
  value: number;
  left: number;
  top: number;
}

interface ClockTick {
  hour: boolean;
  rotation: number;
}

@Component({
  selector: 'app-anytime-clock',
  templateUrl: './anytime-clock.component.html',
  styleUrls: ['./anytime-clock.component.scss'],
})
export class AnytimeClockComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('root') rootRef?: ElementRef<HTMLElement>;
  @ViewChild('seconds') secondsRef?: ElementRef<HTMLElement>;
  @ViewChild('sweep') sweepRef?: ElementRef<HTMLElement>;
  @ViewChild('hourHand') hourHandRef?: ElementRef<HTMLElement>;
  @ViewChild('minuteHand') minuteHandRef?: ElementRef<HTMLElement>;
  @ViewChild('heroA') heroARef?: ElementRef<HTMLImageElement>;
  @ViewChild('heroB') heroBRef?: ElementRef<HTMLImageElement>;
  @ViewChild('orbitImg') orbitImgRef?: ElementRef<HTMLImageElement>;

  private readonly fallbackCups = [
    'assets/image carousel/matcha mango 1 edit.png',
    'assets/image carousel/special mango.png',
    'assets/image carousel/matcha boba edit.png',
    'assets/image carousel/black milk tea edit.png',
    'assets/image carousel/tiger brown creme brulee edit.png',
    'assets/image carousel/kiwi.png',
    'assets/image carousel/coconut.png',
    'assets/image carousel/lychee (1).png',
    'assets/image carousel/blue berry (1).png',
    'assets/image carousel/MANGO 1 edit.png',
    'assets/image carousel/live/live-1.png',
    'assets/image carousel/live/live-2.png',
    'assets/image carousel/live/live-3.png',
    'assets/image carousel/live/live-4.png',
    'assets/image carousel/live/live-5.png',
    'assets/image carousel/live/live-6.png',
    'assets/image carousel/live/live-7.png',
    'assets/image carousel/live/live-8.png',
  ];

  drinks: string[] = [...this.fallbackCups];
  hours: ClockHour[] = [];
  ticks: ClockTick[] = [];
  hotHour = 12;
  clockLabel = '';
  heroASrc = this.fallbackCups[0];
  heroBSrc = this.fallbackCups[1];
  orbitSrc = this.fallbackCups[0];
  reduceMotion = false;

  readonly pearls = [
    { x: 8, y: 18, size: 14, delay: 0, dur: 5.2, color: '#ff8a3d' },
    { x: 92, y: 22, size: 10, delay: 0.8, dur: 4.6, color: '#2bb6cf' },
    { x: 4, y: 62, size: 12, delay: 1.4, dur: 5.8, color: '#ffc340' },
    { x: 96, y: 68, size: 16, delay: 0.4, dur: 4.9, color: '#ff6b00' },
    { x: 14, y: 88, size: 9, delay: 1.1, dur: 6.1, color: '#7dd3c0' },
    { x: 86, y: 90, size: 11, delay: 1.8, dur: 5.4, color: '#ffc4a8' },
  ];

  private drinkIndex = 0;
  private lastSecond = -1;
  private heroIsA = true;
  private running = false;
  private gsapCtx?: gsap.Context;
  private swapTl?: gsap.core.Timeline;
  private observer?: IntersectionObserver;
  private branchSub?: Subscription;
  private mm?: gsap.MatchMedia;

  constructor(
    public languageService: LanguageService,
    private api: ApiService,
    private branchService: BranchService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.hours = Array.from({ length: 12 }, (_, i) => {
      const value = i === 0 ? 12 : i;
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const radius = 39;
      return {
        value,
        left: 50 + radius * Math.cos(angle),
        top: 50 + radius * Math.sin(angle),
      };
    });

    this.ticks = Array.from({ length: 60 }, (_, i) => ({
      hour: i % 5 === 0,
      rotation: i * 6,
    }));
  }

  ngOnInit(): void {
    this.preload(this.fallbackCups);
    const branchId = this.branchService.getCurrentBranch() ?? 2;
    this.loadDrinkImages(branchId);
    this.branchSub = this.branchService.currentBranch$.subscribe((id) => {
      if (id) this.loadDrinkImages(id);
    });
  }

  ngAfterViewInit(): void {
    this.mm = gsap.matchMedia();
    this.mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        reduce: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        this.reduceMotion = !!context.conditions?.['reduce'];
        this.playIntro();
        this.watchVisibility();
        this.syncClock(true);
        if (!this.reduceMotion) this.startClock();
        else this.startSlowCycle();
        return () => {
          this.stopClock();
          this.observer?.disconnect();
        };
      }
    );
  }

  ngOnDestroy(): void {
    this.branchSub?.unsubscribe();
    this.stopClock();
    this.swapTl?.kill();
    this.observer?.disconnect();
    this.mm?.revert();
    this.gsapCtx?.revert();
  }

  trackByHour = (_: number, h: ClockHour) => h.value;
  trackByTick = (i: number) => i;
  trackByPearl = (i: number) => i;

  private playIntro(): void {
    const root = this.rootRef?.nativeElement;
    if (!root) return;
    this.gsapCtx?.revert();
    this.gsapCtx = gsap.context(() => {
      const nums = root.querySelectorAll('.clock__num');
      const inners = root.querySelectorAll('.clock__num-inner');
      const ticks = root.querySelectorAll('.clock__tick');
      gsap.set('.anytime__copy > *', { autoAlpha: 0, y: 28 });
      gsap.set('.clock', { autoAlpha: 0, scale: 0.88 });
      gsap.set(nums, { autoAlpha: 0 });
      gsap.set(inners, { scale: 0.4 });
      gsap.set(ticks, { autoAlpha: 0 });

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          trigger: root,
          start: 'top 78%',
          once: true,
        },
      });

      tl.to('.anytime__copy > *', {
        autoAlpha: 1,
        y: 0,
        duration: this.reduceMotion ? 0 : 0.7,
        stagger: this.reduceMotion ? 0 : 0.08,
      })
        .to(
          '.clock',
          { autoAlpha: 1, scale: 1, duration: this.reduceMotion ? 0 : 0.9, ease: 'back.out(1.4)' },
          '-=0.35'
        )
        .to(
          ticks,
          { autoAlpha: 1, duration: this.reduceMotion ? 0 : 0.45, stagger: this.reduceMotion ? 0 : 0.004 },
          '-=0.55'
        )
        .to(
          nums,
          {
            autoAlpha: 1,
            duration: this.reduceMotion ? 0 : 0.4,
            stagger: this.reduceMotion ? 0 : 0.03,
          },
          '-=0.4'
        )
        .to(
          inners,
          {
            scale: 1,
            duration: this.reduceMotion ? 0 : 0.5,
            stagger: this.reduceMotion ? 0 : 0.04,
            ease: 'back.out(1.8)',
          },
          '<'
        );
    }, root);
  }

  private watchVisibility(): void {
    const root = this.rootRef?.nativeElement;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (this.reduceMotion) return;
        if (entry.isIntersecting) this.startClock();
        else this.stopClock();
      },
      { threshold: 0.12 }
    );
    this.observer.observe(root);
  }

  private startClock(): void {
    if (this.running) return;
    this.running = true;
    this.ngZone.runOutsideAngular(() => {
      gsap.ticker.add(this.onTick);
    });
  }

  private startSlowCycle(): void {
    this.syncClock(true);
    this.ngZone.runOutsideAngular(() => {
      gsap.ticker.add(this.onSlowTick);
    });
  }

  private stopClock(): void {
    this.running = false;
    gsap.ticker.remove(this.onTick);
    gsap.ticker.remove(this.onSlowTick);
  }

  private onTick = (): void => {
    if (!this.running) return;
    this.syncClock(false);
  };

  private lastSlowSwap = 0;
  private onSlowTick = (): void => {
    const now = performance.now();
    if (now - this.lastSlowSwap < 4000) return;
    this.lastSlowSwap = now;
    this.ngZone.run(() => this.advanceDrink(true));
  };

  private syncClock(forceSwap: boolean): void {
    const now = new Date();
    const ms = now.getMilliseconds();
    const sec = now.getSeconds() + ms / 1000;
    const min = now.getMinutes() + sec / 60;
    const hour = (now.getHours() % 12) + min / 60;
    const secDeg = sec * 6;

    const secondsEl = this.secondsRef?.nativeElement;
    const sweepEl = this.sweepRef?.nativeElement;
    const minuteEl = this.minuteHandRef?.nativeElement;
    const hourEl = this.hourHandRef?.nativeElement;
    if (secondsEl) gsap.set(secondsEl, { rotation: secDeg, transformOrigin: '50% 50%' });
    if (sweepEl) gsap.set(sweepEl, { rotation: secDeg, transformOrigin: '50% 50%' });
    if (minuteEl) gsap.set(minuteEl, { rotation: min * 6, transformOrigin: '50% 100%' });
    if (hourEl) gsap.set(hourEl, { rotation: hour * 30, transformOrigin: '50% 100%' });

    const secFloor = Math.floor(sec);
    if (!forceSwap && secFloor === this.lastSecond) return;
    this.lastSecond = secFloor;

    const pointed = Math.round(sec / 5) % 12;
    const nextHot = pointed === 0 ? 12 : pointed;
    const label = this.formatTime(now);
    const shouldSwap = forceSwap ? false : secFloor % 5 === 0;

    this.ngZone.run(() => {
      this.hotHour = nextHot;
      this.clockLabel = label;
      if (shouldSwap) this.advanceDrink();
      this.cdr.detectChanges();
      if (shouldSwap) this.animateDrinkSwap();
      this.pulseHour(nextHot);
    });
  }

  private advanceDrink(animate = false): void {
    if (!this.drinks.length) return;
    this.drinkIndex = (this.drinkIndex + 1) % this.drinks.length;
    const next = this.drinks[this.drinkIndex];
    if (this.heroIsA) this.heroBSrc = next;
    else this.heroASrc = next;
    this.orbitSrc = next;
    if (animate) {
      this.cdr.detectChanges();
      this.animateDrinkSwap();
    }
  }

  private animateDrinkSwap(): void {
    const incoming = this.heroIsA ? this.heroBRef?.nativeElement : this.heroARef?.nativeElement;
    const outgoing = this.heroIsA ? this.heroARef?.nativeElement : this.heroBRef?.nativeElement;
    const orbit = this.orbitImgRef?.nativeElement;
    if (!incoming || !outgoing) return;

    this.swapTl?.kill();
    this.swapTl = gsap.timeline({ defaults: { force3D: true } });

    const durIn = this.reduceMotion ? 0.01 : 0.22;
    const durOut = this.reduceMotion ? 0.01 : 0.42;

    gsap.set(incoming, { autoAlpha: 0, scale: 0.84, rotation: -12 });
    this.swapTl
      .to(
        outgoing,
        {
          autoAlpha: 0,
          scale: 1.04,
          rotation: 10,
          duration: durIn,
          ease: 'power2.in',
        },
        0
      )
      .to(
        incoming,
        {
          autoAlpha: 1,
          scale: 1,
          rotation: 0,
          duration: durOut,
          ease: 'back.out(1.7)',
        },
        this.reduceMotion ? 0 : 0.1
      );

    if (orbit && !this.reduceMotion) {
      this.swapTl.fromTo(
        orbit,
        { scale: 0.72, autoAlpha: 0.35 },
        { scale: 1, autoAlpha: 1, duration: 0.38, ease: 'back.out(2.2)' },
        0
      );
    }

    this.heroIsA = !this.heroIsA;
  }

  private pulseHour(value: number): void {
    const root = this.rootRef?.nativeElement;
    if (!root || this.reduceMotion) return;
    const el = root.querySelector(`.clock__num[data-hour="${value}"] .clock__num-inner`);
    if (!el) return;
    gsap.fromTo(
      el,
      { scale: 1.35 },
      { scale: 1, duration: 0.55, ease: 'power2.out', overwrite: 'auto' }
    );
  }

  private formatTime(date: Date): string {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  private loadDrinkImages(branchId: number): void {
    const apply = (extra: string[]) => {
      this.useDrinks(this.uniqueUrls([...extra, ...this.fallbackCups]));
    };

    this.api.GetAllProducts(branchId, undefined, this.api.drinks).subscribe({
      next: (stock) => {
        const fromStock = this.extractImages(stock);
        this.api.GetBestSellerProducts(branchId).subscribe({
          next: (res) => apply([...this.extractImages(res), ...fromStock]),
          error: () => apply(fromStock),
        });
      },
      error: () => {
        this.api.GetBestSellerProducts(branchId).subscribe({
          next: (res) => apply(this.extractImages(res)),
          error: () => this.useDrinks(this.fallbackCups),
        });
      },
    });
  }

  private uniqueUrls(urls: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const url of urls) {
      const key = url.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
    return out.slice(0, 40);
  }

  private useDrinks(urls: string[]): void {
    this.drinks = urls;
    this.preload(urls);
    this.heroASrc = urls[0];
    this.heroBSrc = urls[1] ?? urls[0];
    this.orbitSrc = urls[0];
    this.cdr.detectChanges();
  }

  private preload(urls: string[]): void {
    urls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }

  private extractImages(payload: any): string[] {
    const list = Array.isArray(payload) ? payload : [];
    const urls = new Set<string>();
    const push = (url?: string | null) => {
      if (!url || typeof url !== 'string') return;
      const trimmed = url.trim();
      if (trimmed) urls.add(trimmed);
    };

    for (const item of list) {
      if (Array.isArray(item?.productImages)) push(item.productImages[0]);
      push(item?.imagePath);
      push(item?.productImage);
      if (Array.isArray(item?.products)) {
        for (const p of item.products) {
          push(p?.imagePath);
          if (Array.isArray(p?.productImages)) push(p.productImages[0]);
        }
      }
    }

    return Array.from(urls).slice(0, 40);
  }
}
