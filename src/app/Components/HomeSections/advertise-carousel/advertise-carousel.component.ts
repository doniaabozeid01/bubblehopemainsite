import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import gsap from 'gsap';
import { ApiService } from 'src/app/services/api.service';
import { LanguageService } from 'src/app/services/language.service';

export interface HeroSlide {
  id: string;
  kind: 'brand' | 'ad';
  badgeKey?: string;
  brandKey?: string;
  titleKey?: string;
  accentKey?: string;
  subtitleKey?: string;
  ctaKey?: string;
  ctaHref?: string;
  image: string;
  imageAlt: string;
}

@Component({
  selector: 'app-advertise-carousel',
  templateUrl: './advertise-carousel.component.html',
  styleUrls: ['./advertise-carousel.component.scss'],
})
export class AdvertiseCarouselComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('track', { static: false }) trackRef?: ElementRef<HTMLElement>;

  activeIndex = 0;

  /** Premium curated slides */
  brandSlides: HeroSlide[] = [
    {
      id: 'pour-up',
      kind: 'brand',
      badgeKey: 'home.heroBadge',
      brandKey: 'home.heroBrand',
      titleKey: 'home.heroPremiumTitle1',
      accentKey: 'home.heroPremiumAccent1',
      subtitleKey: 'home.heroPremiumSub1',
      ctaKey: 'home.heroPremiumCta',
      ctaHref: 'https://offers.bubblehope.com',
      image: '../../../../assets/image carousel/matcha mango 1 edit.png',
      imageAlt: 'Matcha Mango Bubble Hope',
    },
    {
      id: 'burstin',
      kind: 'brand',
      badgeKey: 'home.heroBadgeAlt',
      brandKey: 'home.heroBrand',
      titleKey: 'home.heroPremiumTitle2',
      accentKey: 'home.heroPremiumAccent2',
      subtitleKey: 'home.heroPremiumSub2',
      ctaKey: 'home.heroOrder',
      ctaHref: 'https://offers.bubblehope.com',
      image: '../../../../assets/Untitled-1 (4).png',
      imageAlt: 'Bubble Hope signature cups',
    },
    {
      id: 'mango',
      kind: 'brand',
      badgeKey: 'home.heroBadge',
      brandKey: 'home.heroBrand',
      titleKey: 'home.heroPremiumTitle3',
      accentKey: 'home.heroPremiumAccent3',
      subtitleKey: 'home.heroPremiumSub3',
      ctaKey: 'home.heroMenu',
      ctaHref: '/products',
      image: '../../../../assets/image carousel/special mango.png',
      imageAlt: 'Mango Colada Bubble Hope',
    },
    {
      id: 'brown-sugar',
      kind: 'brand',
      badgeKey: 'home.heroBadgeAlt',
      brandKey: 'home.heroBrand',
      titleKey: 'home.heroPremiumTitle4',
      accentKey: 'home.heroPremiumAccent4',
      subtitleKey: 'home.heroPremiumSub4',
      ctaKey: 'home.heroPremiumCta',
      ctaHref: 'https://offers.bubblehope.com',
      image: '../../../../assets/image carousel/tiger brown creme brulee edit.png',
      imageAlt: 'Brown Sugar Bubble Hope',
    },
  ];

  adSlides: HeroSlide[] = [];

  floatItems = [
    { top: '12%', left: '58%', size: 28, color: '#FF8A3D', dur: 3.4 },
    { top: '22%', left: '78%', size: 18, color: '#2bb6cf', dur: 4.1 },
    { top: '48%', left: '52%', size: 22, color: '#FFC340', dur: 3.8 },
    { top: '62%', left: '82%', size: 32, color: '#FF6B00', dur: 4.4 },
    { top: '70%', left: '62%', size: 16, color: '#7dd3c0', dur: 3.6 },
    { top: '18%', left: '68%', size: 14, color: '#ffc4a8', dur: 3.2 },
  ];

  private gsapCtx?: gsap.Context;
  private autoTimer?: ReturnType<typeof setInterval>;
  private langSub?: { unsubscribe: () => void };

  constructor(
    private api: ApiService,
    public languageService: LanguageService,
    private ngZone: NgZone,
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.langSub = this.languageService.languageChanged$.subscribe(() => {
      this.cdr.detectChanges();
      setTimeout(() => this.scrollTo(this.activeIndex, false), 40);
    });

    this.api.GetAllAdvertisements().subscribe({
      next: (res) => {
        const arr = Array.isArray(res)
          ? res
          : res?.value || res?.data || res?.result || [];
        this.adSlides = (arr || [])
          .map((x: any, i: number) => ({
            id: `ad-${x.id ?? i}`,
            kind: 'ad' as const,
            image: x.imageUrl || x.url || x.image,
            imageAlt: x.title || 'Promotion',
          }))
          .filter((s: HeroSlide) => !!s.image);
        this.cdr.detectChanges();
        this.startAutoplay();
      },
      error: () => undefined,
    });
  }

  ngAfterViewInit(): void {
    this.startAutoplay();
    setTimeout(() => this.playIntro(), 60);
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.stopAutoplay();
    this.gsapCtx?.revert();
  }

  get slides(): HeroSlide[] {
    return [...this.brandSlides, ...this.adSlides];
  }

  get dotIndexes(): number[] {
    return this.slides.map((_, i) => i);
  }

  trackById = (_: number, s: HeroSlide) => s.id;

  onScroll(): void {
    const el = this.trackRef?.nativeElement;
    if (!el) return;
    const w = el.clientWidth || 1;
    const raw = el.scrollLeft;
    const offset = raw < 0 ? Math.abs(raw) : raw;
    const idx = Math.round(offset / w);
    const next = Math.max(0, Math.min(idx, this.slides.length - 1));
    if (next !== this.activeIndex) {
      this.activeIndex = next;
      if (this.slides[next]?.kind === 'brand') {
        setTimeout(() => this.playIntro(), 30);
      }
    }
  }

  goTo(index: number): void {
    this.scrollTo(index, true);
    this.startAutoplay();
  }

  @HostListener('window:resize')
  onResize(): void {
    setTimeout(() => this.scrollTo(this.activeIndex, false), 50);
  }

  private scrollTo(index: number, smooth: boolean): void {
    const el = this.trackRef?.nativeElement;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, this.slides.length - 1));
    this.activeIndex = clamped;
    el.scrollTo({
      left: clamped * el.clientWidth,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  private startAutoplay(): void {
    this.stopAutoplay();
    if (this.slides.length < 2) return;
    this.autoTimer = setInterval(() => {
      const next = (this.activeIndex + 1) % this.slides.length;
      this.scrollTo(next, true);
      if (this.slides[next]?.kind === 'brand') {
        setTimeout(() => this.playIntro(), 80);
      }
    }, 5800);
  }

  private stopAutoplay(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = undefined;
    }
  }

  private playIntro(): void {
    const slide = this.host.nativeElement.querySelector(
      `.hero-slide[data-index="${this.activeIndex}"]`
    ) as HTMLElement | null;
    if (!slide || slide.dataset['kind'] === 'ad') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.ngZone.runOutsideAngular(() => {
      this.gsapCtx?.revert();
      this.gsapCtx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.hero-badge', { y: 12, opacity: 0, duration: 0.4, clearProps: 'all' })
          .from('.hero-brand', { y: 16, opacity: 0, duration: 0.45, clearProps: 'all' }, '-=0.2')
          .from(
            '.hero-title__word',
            { y: 36, opacity: 0, duration: 0.65, stagger: 0.08, clearProps: 'all' },
            '-=0.22'
          )
          .from('.hero-sub', { y: 14, opacity: 0, duration: 0.45, clearProps: 'all' }, '-=0.3')
          .from('.hero-cta', { y: 14, opacity: 0, duration: 0.4, clearProps: 'all' }, '-=0.22')
          .from(
            '.hero-visual__img',
            { scale: 0.9, opacity: 0, duration: 0.85, ease: 'power2.out', clearProps: 'opacity,scale' },
            '-=0.7'
          )
          .from(
            '.hero-float',
            { scale: 0, opacity: 0, duration: 0.45, stagger: 0.05, ease: 'back.out(1.6)', clearProps: 'all' },
            '-=0.5'
          );
      }, slide);
    });
  }
}
