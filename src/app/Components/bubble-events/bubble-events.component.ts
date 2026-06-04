import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SeoService } from 'src/app/services/seo.service';

gsap.registerPlugin(ScrollTrigger);

export interface EventGalleryItem {
  id: string;
  type: 'image' | 'video';
  src: string;
  poster?: string;
  alt: string;
  depth: number;
  eventType: string;
  packageName: string;
  location: string;
  offsetX: number;
  offsetY: number;
  rotate: number;
  width: number;
}

export interface EventPackage {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge: 'branch' | 'catering' | 'both';
}

const PEX = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop`;

const PEX_HERO = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop`;

export interface HeroSlide {
  src: string;
  alt: string;
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
  @ViewChildren('galleryCard') galleryCards!: QueryList<ElementRef<HTMLElement>>;

  private scrollTriggers: ScrollTrigger[] = [];
  private gsapCtx?: gsap.Context;
  private bubbleTweens: gsap.core.Tween[] = [];

  lightboxOpen = false;
  activeGalleryItem: EventGalleryItem | null = null;
  eventTypeMenuOpen = false;
  venueMenuOpen = false;
  splitHover: 'branch' | 'catering' | null = null;

  /** Rotating hero backgrounds — kids birthdays & wedding/afrah. */
  readonly heroSlides: HeroSlide[] = [
    { src: PEX_HERO(7155950), alt: 'Children celebrating a birthday' },
    { src: PEX_HERO(799443), alt: 'Kids birthday party' },
    { src: PEX_HERO(6220553), alt: 'Kids birthday party table' },
    { src: PEX_HERO(1721833), alt: 'Wedding celebration lights' },
    { src: PEX_HERO(2526105), alt: 'Wedding party celebration' },
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

  readonly branches = [
    'Hadayek Al Ahram',
    'Zewail City',
    'Maslat Dahshour',
  ];

  readonly eventTypes = [
    'Birthday Party',
    'Kids Celebration',
    'Wedding / Afrah',
    'Private Gathering',
    'Corporate Event',
    'Custom Catering',
  ];

  readonly galleryItems: EventGalleryItem[] = [
    {
      id: 'g1',
      type: 'image',
      src: PEX(7155950),
      alt: 'Children celebrating a birthday at Bubble Hope',
      depth: 1,
      eventType: 'Birthday Party',
      packageName: 'Bubble Celebration',
      location: 'Hadayek Al Ahram',
      offsetX: -4,
      offsetY: 0,
      rotate: -4,
      width: 280,
    },
    {
      id: 'g2',
      type: 'image',
      src: PEX(6220553),
      alt: 'Kids birthday party table setup',
      depth: 2,
      eventType: 'Kids Celebration',
      packageName: 'Joy & Play',
      location: 'Zewail City',
      offsetX: 8,
      offsetY: -24,
      rotate: 3,
      width: 240,
    },
    {
      id: 'g3',
      type: 'image',
      src: PEX(6218441),
      alt: 'Kids birthday celebration with cake',
      depth: 3,
      eventType: 'Birthday Party',
      packageName: 'Premium Party Package',
      location: 'Maslat Dahshour',
      offsetX: -12,
      offsetY: 18,
      rotate: -2,
      width: 220,
    },
    {
      id: 'g4',
      type: 'image',
      src: PEX(1721833),
      alt: 'Wedding celebration with lights',
      depth: 2,
      eventType: 'Wedding / Afrah',
      packageName: 'Catering Deluxe',
      location: 'External Venue',
      offsetX: 14,
      offsetY: 8,
      rotate: 5,
      width: 300,
    },
    {
      id: 'g5',
      type: 'image',
      src: PEX(2526105),
      alt: 'Wedding party celebration',
      depth: 1,
      eventType: 'Wedding / Afrah',
      packageName: 'Custom Boba Bar',
      location: 'Zewail City',
      offsetX: 0,
      offsetY: -12,
      rotate: -3,
      width: 260,
    },
    {
      id: 'g6',
      type: 'image',
      src: PEX(265088),
      alt: 'Wedding reception dancing',
      depth: 3,
      eventType: 'Wedding / Afrah',
      packageName: 'Dream Decor',
      location: 'Hadayek Al Ahram',
      offsetX: 6,
      offsetY: 22,
      rotate: 2,
      width: 250,
    },
  ];

  readonly packages: EventPackage[] = [
    {
      id: 'boba',
      title: 'Custom Boba Bar',
      description: 'Signature drinks, toppings, and a styled bar experience tailored to your theme.',
      icon: 'bi-cup-straw',
      badge: 'both',
    },
    {
      id: 'dj',
      title: 'DJ & Sound',
      description: 'Professional sound setup with playlists curated for kids and family celebrations.',
      icon: 'bi-music-note-beamed',
      badge: 'both',
    },
    {
      id: 'decor',
      title: 'Dream Decorations',
      description: 'Balloon arches, themed backdrops, and table styling that photographs beautifully.',
      icon: 'bi-stars',
      badge: 'branch',
    },
    {
      id: 'waffle',
      title: 'Waffle Station',
      description: 'Fresh waffles with sauces and toppings — a crowd favorite at every party.',
      icon: 'bi-grid-3x3-gap',
      badge: 'branch',
    },
    {
      id: 'catering',
      title: 'Off-Site Catering',
      description: 'Full beverage and snack catering delivered to your venue with setup support.',
      icon: 'bi-truck',
      badge: 'catering',
    },
    {
      id: 'photo',
      title: 'Photo Moments',
      description: 'Styled corners and props designed for reels, portraits, and family memories.',
      icon: 'bi-camera',
      badge: 'both',
    },
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
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.seoService.updateTitleAndDescription(
      'Bubble Events | Parties & Birthdays | Bubble Hope',
      'Celebrate with Bubble Hope — in-branch birthday parties and premium external catering across our locations.'
    );

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

      this.initGalleryParallax(!isCompact);
      this.initBgBubbles();
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
  }

  scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnDestroy(): void {
    if (this.heroSlideTimer) {
      clearInterval(this.heroSlideTimer);
    }
    this.gsapCtx?.revert();
    this.scrollTriggers.forEach((t) => t.kill());
    this.scrollTriggers = [];
    this.bubbleTweens.forEach((t) => t.kill());
  }

  private initGalleryParallax(enabled = true): void {
    if (!enabled) return;

    this.galleryCards?.forEach((ref, i) => {
      const el = ref.nativeElement;
      const item = this.galleryItems[i];
      if (!el || !item) return;

      const st = ScrollTrigger.create({
        trigger: this.gallerySection?.nativeElement,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
        animation: gsap.to(el, {
          y: item.depth * 28 * (i % 2 === 0 ? -1 : 1),
          ease: 'none',
        }),
      });
      this.scrollTriggers.push(st);
    });
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

    const section = this.gallerySection?.nativeElement;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return;

    const gx = (event.clientX / window.innerWidth - 0.5) * 2;
    const gy = (event.clientY / window.innerHeight - 0.5) * 2;

    gsap.to('.events-gallery__parallax-layer', {
      x: gx * 18,
      y: gy * 12,
      duration: 1.2,
      ease: 'power2.out',
    });
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

  badgeLabel(badge: EventPackage['badge']): string {
    switch (badge) {
      case 'branch':
        return 'In-Branch Only';
      case 'catering':
        return 'Available for Catering';
      default:
        return 'In-Branch & Catering';
    }
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
    const { name, phone, eventType, guestCount, venue } = this.booking;
    if (!name || !phone || !eventType || !guestCount || !venue) {
      this.toastr.error('Please fill in all required fields.');
      return;
    }
    this.toastr.success(`Thanks ${name}! Our events team will contact you shortly.`);
    this.booking = {
      name: '',
      phone: '',
      eventType: '',
      guestCount: '',
      venue: '',
      notes: '',
    };
  }

  setSplitHover(side: 'branch' | 'catering' | null): void {
    this.splitHover = side;
  }
}
