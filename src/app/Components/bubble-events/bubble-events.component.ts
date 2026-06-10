import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';

gsap.registerPlugin(ScrollTrigger);

export interface EventGalleryItem {
  id: string;
  type: 'image' | 'video';
  src: string;
  poster?: string;
}

export interface EventPackage {
  id: string;
  icon: string;
  badge: 'branch' | 'catering' | 'both';
}

export interface SelectOption {
  id: string;
}

const PEX = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop`;

const PEX_HERO = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop`;

const PEX_SPLIT = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop`;

const PEX_GALLERY = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1100&h=825&fit=crop`;

export interface SplitBranch {
  id: string;
  rating: number;
}

export interface HeroSlide {
  src: string;
  slideKey: string;
}

export interface HeroBubble {
  id: number;
  size: number;
  x: number;
  delay: number;
  duration: number;
  opacity: number;
  variant: 0 | 1 | 2;
  drift: number;
}

@Component({
  selector: 'app-bubble-events',
  templateUrl: './bubble-events.component.html',
  styleUrls: ['./bubble-events.component.scss'],
})
export class BubbleEventsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('heroSection') heroSection!: ElementRef<HTMLElement>;
  @ViewChild('heroBg') heroBg!: ElementRef<HTMLElement>;
  @ViewChild('heroContent') heroContent!: ElementRef<HTMLElement>;
  @ViewChild('heroBubblesLayer') heroBubblesLayer!: ElementRef<HTMLElement>;
  @ViewChild('gallerySection') gallerySection!: ElementRef<HTMLElement>;
  @ViewChild('galleryRail') galleryRail!: ElementRef<HTMLElement>;

  private scrollTriggers: ScrollTrigger[] = [];
  private gsapCtx?: gsap.Context;
  private bubbleTweens: gsap.core.Tween[] = [];
  private langSub?: Subscription;
  private galleryAutoplayTimer?: ReturnType<typeof setInterval>;
  private galleryProgressTimer?: ReturnType<typeof setInterval>;
  private galleryAutoplayPaused = false;

  readonly gallerySlideDuration = 5200;
  readonly marqueeCopies = [0, 1];

  galleryActiveIndex = 0;
  galleryHeroFresh = true;
  galleryProgress = 0;
  galleryHeroHeight = 620;

  lightboxOpen = false;
  activeGalleryItem: EventGalleryItem | null = null;
  eventTypeMenuOpen = false;
  venueMenuOpen = false;
  submittingBooking = false;
  splitHover: 'branch' | 'catering' | null = null;

  readonly splitBranchImage = PEX_SPLIT(7155950);
  readonly splitCateringImage = PEX_SPLIT(2526105);

  readonly splitBranches: SplitBranch[] = [
    { id: 'hadayek', rating: 4.9 },
    { id: 'zewail', rating: 4.8 },
    { id: 'maslat', rating: 4.9 },
  ];

  readonly cateringHighlightKeys = ['bobaBar', 'waffle', 'branded', 'staff'];

  /** Rotating hero backgrounds — kids birthdays & wedding/afrah. */
  readonly heroSlides: HeroSlide[] = [
    { src: PEX_HERO(7155950), slideKey: '0' },
    { src: PEX_HERO(799443), slideKey: '1' },
    { src: PEX_HERO(6220553), slideKey: '2' },
    { src: PEX_HERO(1721833), slideKey: '3' },
    { src: PEX_HERO(2526105), slideKey: '4' },
  ];

  readonly heroSlideDuration = 5000;

  heroSlideIndex = 0;
  private heroSlideTimer?: ReturnType<typeof setInterval>;

  readonly heroBubbles: HeroBubble[] = [
    { id: 0, size: 38, x: 6, delay: 0, duration: 9, opacity: 0.16, variant: 0, drift: 28 },
    { id: 1, size: 52, x: 14, delay: 1.2, duration: 12, opacity: 0.12, variant: 1, drift: -24 },
    { id: 2, size: 28, x: 22, delay: 0.4, duration: 8, opacity: 0.18, variant: 2, drift: 22 },
    { id: 3, size: 44, x: 31, delay: 2.8, duration: 11, opacity: 0.14, variant: 0, drift: -30 },
    { id: 4, size: 34, x: 40, delay: 0.8, duration: 10, opacity: 0.11, variant: 1, drift: 26 },
    { id: 5, size: 58, x: 48, delay: 3.5, duration: 14, opacity: 0.2, variant: 2, drift: -20 },
    { id: 6, size: 26, x: 55, delay: 1.6, duration: 7, opacity: 0.15, variant: 0, drift: 18 },
    { id: 7, size: 48, x: 63, delay: 4.2, duration: 13, opacity: 0.13, variant: 1, drift: -28 },
    { id: 8, size: 36, x: 71, delay: 0.2, duration: 9, opacity: 0.17, variant: 2, drift: 24 },
    { id: 9, size: 54, x: 78, delay: 2.1, duration: 12, opacity: 0.1, variant: 0, drift: -22 },
    { id: 10, size: 30, x: 84, delay: 3.8, duration: 8, opacity: 0.16, variant: 1, drift: 30 },
    { id: 11, size: 42, x: 90, delay: 1.4, duration: 11, opacity: 0.14, variant: 2, drift: -18 },
    { id: 12, size: 50, x: 18, delay: 4.8, duration: 13, opacity: 0.12, variant: 0, drift: 20 },
    { id: 13, size: 32, x: 67, delay: 2.5, duration: 10, opacity: 0.19, variant: 1, drift: -26 },
  ];

  readonly venueOptions: SelectOption[] = [
    { id: 'hadayek' },
    { id: 'zewail' },
    { id: 'maslat' },
    { id: 'external' },
  ];

  readonly eventTypeOptions: SelectOption[] = [
    { id: 'birthday' },
    { id: 'kids' },
    { id: 'wedding' },
    { id: 'private' },
    { id: 'corporate' },
    { id: 'catering' },
  ];

  /** Same themes as hero — 4 birthdays + 4 weddings/afrah (verified Pexels IDs). */
  /** 4 kids birthdays + 4 wedding/afrah — verified Pexels IDs only. */
  readonly galleryItems: EventGalleryItem[] = [
    { id: 'g1', type: 'image', src: PEX_GALLERY(7155950) },
    { id: 'g2', type: 'image', src: PEX_GALLERY(1721833) },
    { id: 'g3', type: 'image', src: PEX_GALLERY(799443) },
    { id: 'g4', type: 'image', src: PEX_GALLERY(2526105) },
    { id: 'g5', type: 'image', src: PEX_GALLERY(5877417) },
    { id: 'g6', type: 'image', src: PEX_GALLERY(3171837) },
    { id: 'g7', type: 'image', src: PEX_GALLERY(6220553) },
    { id: 'g8', type: 'image', src: PEX_GALLERY(265088) },
  ];

  readonly galleryStats = [
    { valueKey: 'bubbleEvents.page.gallery.stats.eventsValue', labelKey: 'bubbleEvents.page.gallery.stats.eventsLabel' },
    { valueKey: 'bubbleEvents.page.gallery.stats.stylesValue', labelKey: 'bubbleEvents.page.gallery.stats.stylesLabel' },
    { valueKey: 'bubbleEvents.page.gallery.stats.branchesValue', labelKey: 'bubbleEvents.page.gallery.stats.branchesLabel' },
  ];

  readonly galleryMarqueeKeys = [
    'bubbleEvents.page.gallery.marquee.birthdays',
    'bubbleEvents.page.gallery.marquee.weddings',
    'bubbleEvents.page.gallery.marquee.kids',
    'bubbleEvents.page.gallery.marquee.catering',
    'bubbleEvents.page.gallery.marquee.decor',
    'bubbleEvents.page.gallery.marquee.dj',
    'bubbleEvents.page.gallery.marquee.photo',
  ];

  readonly galleryMarqueeKeysReversed = [...this.galleryMarqueeKeys].reverse();

  readonly packages: EventPackage[] = [
    { id: 'boba', icon: 'bi-cup-straw', badge: 'both' },
    { id: 'dj', icon: 'bi-music-note-beamed', badge: 'both' },
    { id: 'decor', icon: 'bi-stars', badge: 'branch' },
    { id: 'waffle', icon: 'bi-grid-3x3-gap', badge: 'branch' },
    { id: 'catering', icon: 'bi-truck', badge: 'catering' },
    { id: 'photo', icon: 'bi-camera', badge: 'both' },
  ];

  readonly bgBubbles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    size: 36 + (i % 4) * 18,
    x: (i * 17) % 100,
    y: (i * 23) % 100,
    delay: i * 0.4,
  }));

  booking = {
    name: '',
    phone: '',
    eventType: '',
    guestCount: '',
    venue: '',
    notes: '',
  };

  constructor(
    private seoService: SeoService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.updateSeo();
    this.langSub = this.translate.onLangChange.subscribe(() => this.updateSeo());

    if (typeof window !== 'undefined' && this.heroSlides.length > 1) {
      this.heroSlideTimer = setInterval(() => {
        this.heroSlideIndex = (this.heroSlideIndex + 1) % this.heroSlides.length;
      }, this.heroSlideDuration);
    }
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.gsapCtx = gsap.context(() => {
      gsap.from('.events-hero__badge', {
        opacity: 0,
        y: 20,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.2,
      });

      gsap.from('.events-hero__title-inner', {
        y: '100%',
        duration: 0.9,
        ease: 'power3.out',
        delay: 0.4,
      });

      gsap.from('.events-hero__subtitle-inner', {
        y: '100%',
        duration: 0.9,
        ease: 'power3.out',
        delay: 0.6,
      });

      gsap.from('.events-hero__actions', {
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.9,
      });

      gsap.from('.events-hero__scroll', {
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        delay: 1.4,
      });

      const hero = this.heroSection?.nativeElement;
      const bg = this.heroBg?.nativeElement;
      const content = this.heroContent?.nativeElement;
      const isCompact = window.matchMedia('(max-width: 768px)').matches;

      if (!isCompact && hero && bg) {
        const bgSt = ScrollTrigger.create({
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2,
          animation: gsap.to(bg, {
            scale: 0.72,
            borderRadius: 32,
            opacity: 0.85,
            y: 40,
            ease: 'none',
          }),
        });
        this.scrollTriggers.push(bgSt);
      }

      if (!isCompact && hero && content) {
        const contentSt = ScrollTrigger.create({
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
          animation: gsap.to(content, {
            y: '-20%',
            opacity: 0,
            ease: 'none',
          }),
        });
        this.scrollTriggers.push(contentSt);
      }

      gsap.utils.toArray<HTMLElement>('.events-reveal').forEach((el) => {
        gsap.from(el, {
          y: 36,
          duration: 0.75,
          ease: 'power2.out',
          immediateRender: false,
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      });

      this.updateGalleryHeroHeight();
      requestAnimationFrame(() => {
        this.initGalleryAutoplay(!isCompact);
        ScrollTrigger.refresh();
      });
      this.initBgBubbles();
    });
  }

  scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    if (this.heroSlideTimer) {
      clearInterval(this.heroSlideTimer);
    }
    this.gsapCtx?.revert();
    this.scrollTriggers.forEach((t) => t.kill());
    this.scrollTriggers = [];
    this.bubbleTweens.forEach((t) => t.kill());
    this.clearGalleryAutoplay();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateGalleryHeroHeight();
  }

  get featuredGalleryItem(): EventGalleryItem {
    return this.galleryItems[this.galleryActiveIndex];
  }

  private updateGalleryHeroHeight(): void {
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    if (viewportW < 768) {
      this.galleryHeroHeight = Math.round(Math.min(440, Math.max(340, viewportH * 0.45)));
      return;
    }

    if (viewportW < 1200) {
      this.galleryHeroHeight = Math.round(Math.min(540, Math.max(480, viewportH * 0.5)));
      return;
    }

    this.galleryHeroHeight = Math.round(Math.min(720, Math.max(620, viewportH * 0.6)));
  }

  get galleryStackItems(): EventGalleryItem[] {
    return [1, 2, 3].map(
      (offset) => this.galleryItems[(this.galleryActiveIndex + offset) % this.galleryItems.length]
    );
  }

  selectGallerySlide(index: number): void {
    if (index === this.galleryActiveIndex) return;
    this.galleryActiveIndex = index;
    this.pulseGalleryHero();
    this.scrollGalleryThumbIntoView(index);
    this.restartGalleryAutoplay();
  }

  selectGalleryByItem(item: EventGalleryItem): void {
    const index = this.galleryItems.findIndex((entry) => entry.id === item.id);
    if (index >= 0) {
      this.selectGallerySlide(index);
    }
  }

  nextGallerySlide(): void {
    this.selectGallerySlide((this.galleryActiveIndex + 1) % this.galleryItems.length);
  }

  prevGallerySlide(): void {
    this.selectGallerySlide(
      (this.galleryActiveIndex - 1 + this.galleryItems.length) % this.galleryItems.length
    );
  }

  pauseGalleryAutoplay(): void {
    this.galleryAutoplayPaused = true;
  }

  resumeGalleryAutoplay(): void {
    this.galleryAutoplayPaused = false;
  }

  private initGalleryAutoplay(enabled = true): void {
    this.clearGalleryAutoplay();
    this.galleryProgress = 0;

    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const progressStep = 100 / (this.gallerySlideDuration / 100);
    this.galleryProgressTimer = setInterval(() => {
      if (this.galleryAutoplayPaused) return;
      this.galleryProgress = Math.min(100, this.galleryProgress + progressStep);
    }, 100);

    this.galleryAutoplayTimer = setInterval(() => {
      if (this.galleryAutoplayPaused) return;
      this.nextGallerySlide();
    }, this.gallerySlideDuration);
  }

  private restartGalleryAutoplay(): void {
    this.galleryProgress = 0;
  }

  private clearGalleryAutoplay(): void {
    if (this.galleryAutoplayTimer) {
      clearInterval(this.galleryAutoplayTimer);
      this.galleryAutoplayTimer = undefined;
    }
    if (this.galleryProgressTimer) {
      clearInterval(this.galleryProgressTimer);
      this.galleryProgressTimer = undefined;
    }
  }

  private pulseGalleryHero(): void {
    this.galleryHeroFresh = false;
    requestAnimationFrame(() => {
      this.galleryHeroFresh = true;
    });
  }

  private scrollGalleryThumbIntoView(index: number): void {
    const rail = this.galleryRail?.nativeElement;
    const thumb = rail?.children[index] as HTMLElement | undefined;
    thumb?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  private initBgBubbles(): void {
    gsap.utils.toArray<HTMLElement>('.events-bg-bubble').forEach((bubble, i) => {
      const tween = gsap.to(bubble, {
        y: '+=24',
        x: i % 2 === 0 ? '+=12' : '-=12',
        duration: 3 + (i % 3),
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.2,
      });
      this.bubbleTweens.push(tween);
    });
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (window.matchMedia('(max-width: 768px)').matches) return;

    const nx = (event.clientX / window.innerWidth - 0.5) * 24;
    const ny = (event.clientY / window.innerHeight - 0.5) * 14;

    if (this.heroBubblesLayer?.nativeElement) {
      gsap.to(this.heroBubblesLayer.nativeElement, {
        x: nx,
        y: ny,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

  }

  openLightbox(item: EventGalleryItem): void {
    this.activeGalleryItem = item;
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    this.activeGalleryItem = null;
    document.body.style.overflow = '';
  }

  private updateSeo(): void {
    this.seoService.updateTitleAndDescription(
      this.translate.instant('bubbleEvents.page.seoTitle'),
      this.translate.instant('bubbleEvents.page.seoDescription')
    );
  }

  galleryKey(item: EventGalleryItem, field: 'alt' | 'eventType' | 'package' | 'location'): string {
    return `bubbleEvents.page.gallery.${item.id}.${field}`;
  }

  toggleEventTypeMenu(event: Event): void {
    event.stopPropagation();
    this.eventTypeMenuOpen = !this.eventTypeMenuOpen;
    this.venueMenuOpen = false;
  }

  toggleVenueMenu(event: Event): void {
    event.stopPropagation();
    this.venueMenuOpen = !this.venueMenuOpen;
    this.eventTypeMenuOpen = false;
  }

  selectEventType(value: string, event: Event): void {
    event.stopPropagation();
    this.booking.eventType = value;
    this.eventTypeMenuOpen = false;
  }

  selectVenue(value: string, event: Event): void {
    event.stopPropagation();
    this.booking.venue = value;
    this.venueMenuOpen = false;
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.eventTypeMenuOpen = false;
    this.venueMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.lightboxOpen) this.closeLightbox();
    this.eventTypeMenuOpen = false;
    this.venueMenuOpen = false;
  }

  submitBooking(): void {
    if (this.submittingBooking) return;

    const { name, phone, eventType, guestCount, venue } = this.booking;
    if (!name?.trim() || !phone?.trim() || !eventType || !guestCount || !venue) {
      this.toastr.error(this.translate.instant('bubbleEvents.page.toast.errorRequired'));
      return;
    }

    this.submittingBooking = true;
    this.eventTypeMenuOpen = false;
    this.venueMenuOpen = false;

    // Simulated request — replace with API when endpoint is available.
    setTimeout(() => {
      this.toastr.success(
        this.translate.instant('bubbleEvents.page.toast.success', { name: name.trim() })
      );
      this.booking = {
        name: '',
        phone: '',
        eventType: '',
        guestCount: '',
        venue: '',
        notes: '',
      };
      this.submittingBooking = false;
    }, 600);
  }

  setSplitHover(side: 'branch' | 'catering' | null): void {
    this.splitHover = side;
  }
}
