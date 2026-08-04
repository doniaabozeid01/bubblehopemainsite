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
import { CarouselComponent, OwlOptions } from 'ngx-owl-carousel-o';
import { ApiService } from '../../../services/api.service';
import { BranchService } from '../../../services/branch.service';
import { LanguageService } from '../../../services/language.service';

export interface MaterialPillar {
  num: string;
  image: string;
  /** Up to 4 product shots from the category — shown as one collage body */
  images: string[];
  title: string;
  titleAr: string;
  desc: string;
  descAr: string;
  category: string;
  categoryAr: string;
  categoryId: number | null;
}

@Component({
  selector: 'app-materials-section',
  templateUrl: './materials-section.component.html',
  styleUrls: ['./materials-section.component.scss'],
})
export class MaterialsSectionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sectionRef', { static: true }) sectionRef!: ElementRef<HTMLElement>;
  @ViewChild('trackRef') trackRef?: ElementRef<HTMLElement>;
  @ViewChild('materialsCarousel') materialsCarousel?: CarouselComponent;

  /** Soft display progress (lerped) — drives transform + bar. */
  progress = 0;
  isDesktop = false;
  stickyStyles: Record<string, string> = {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    width: '100%',
  };

  mobileOptions: OwlOptions = {
    loop: false,
    center: true,
    dots: true,
    nav: false,
    margin: 14,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: true,
    rtl: false,
    items: 1,
    stagePadding: 18,
    smartSpeed: 550,
  };

  /** Preferred display order when the API returns these names. */
  private readonly categoryOrder = [
    'Milk Tea',
    'Matcha Classic',
    'Our Signature',
    'Mojito',
    'Ice Tea',
    'Hot Coffee',
    'Iced Coffee',
    'Frappe&Smothie',
    'Soft Drinks',
    'seasonal drinks',
  ];

  /** Keep the home section short — only the first 5 categories. */
  private readonly maxPillars = 5;
  /** How many drink shots to cluster per category collage. */
  private readonly maxImagesPerPillar = 3;
  /** Soft follow — lower = silkier / more lag (video-like). */
  private readonly lerpFactor = 0.085;
  /** Extra scroll runway per panel for a calmer pace. */
  private readonly vhPerPanel = 1.15;

  pillars: MaterialPillar[] = this.buildFallbackPillars();

  private mediaQuery?: MediaQueryList;
  private mediaListener?: (e: MediaQueryListEvent) => void;
  private raf = 0;
  private lerpRaf = 0;
  private snapTimer: ReturnType<typeof setTimeout> | null = null;
  private targetProgress = 0;
  private displayProgress = 0;
  private langSub?: { unsubscribe: () => void };
  private snapping = false;

  constructor(
    public languageService: LanguageService,
    private api: ApiService,
    private branchService: BranchService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  get sectionHeightVh(): number {
    return Math.max(1, this.pillars.length) * this.vhPerPanel * 100;
  }

  get translateVw(): number {
    return this.progress * Math.max(0, this.pillars.length - 1) * 100;
  }

  get isAr(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  get activeIndex(): number {
    const n = Math.max(1, this.pillars.length - 1);
    return Math.round(this.progress * n);
  }

  pillarTitle(p: MaterialPillar): string {
    return this.isAr ? p.titleAr || p.title : p.title || p.titleAr;
  }

  pillarDesc(p: MaterialPillar): string {
    return this.isAr ? p.descAr || p.desc : p.desc || p.descAr;
  }

  pillarCategory(p: MaterialPillar): string {
    return this.isAr ? p.categoryAr || p.category : p.category || p.categoryAr;
  }

  panelStyle(index: number): Record<string, string> {
    const n = Math.max(1, this.pillars.length - 1);
    const exact = this.progress * n;
    const dist = Math.min(1.25, Math.abs(index - exact));
    const opacity = String(1 - dist * 0.28);
    const scale = String(1 - dist * 0.035);
    return {
      opacity,
      transform: `scale(${scale})`,
    };
  }

  ngOnInit(): void {
    this.syncMobileRtl();
    this.langSub = this.languageService.languageChanged$.subscribe(() => {
      this.syncMobileRtl();
      this.cdr.markForCheck();
    });

    const branchId = this.branchService.getCurrentBranch() ?? 2;
    this.loadPillars(branchId);
    this.branchService.currentBranch$.subscribe((id) => {
      if (id) this.loadPillars(id);
    });
  }

  ngAfterViewInit(): void {
    this.mediaQuery = window.matchMedia('(min-width: 1024px)');
    this.isDesktop = this.mediaQuery.matches;
    this.mediaListener = (e: MediaQueryListEvent) => {
      this.isDesktop = e.matches;
      if (!e.matches) {
        this.progress = 0;
        this.targetProgress = 0;
        this.displayProgress = 0;
        this.stickyStyles = {};
        this.stopLerp();
      }
      this.cdr.detectChanges();
      this.queueUpdate();
    };
    this.mediaQuery.addEventListener('change', this.mediaListener);
    this.cdr.detectChanges();
    this.queueUpdate();
  }

  ngOnDestroy(): void {
    if (this.mediaQuery && this.mediaListener) {
      this.mediaQuery.removeEventListener('change', this.mediaListener);
    }
    if (this.raf) cancelAnimationFrame(this.raf);
    this.stopLerp();
    if (this.snapTimer) clearTimeout(this.snapTimer);
    this.langSub?.unsubscribe();
  }

  private syncMobileRtl(): void {
    this.mobileOptions = {
      ...this.mobileOptions,
      rtl: this.isAr,
    };
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onScroll(): void {
    this.queueUpdate();
    this.scheduleSnap();
  }

  private loadPillars(branchId: number): void {
    this.api.GetAllProducts(branchId).subscribe({
      next: (res) => {
        const next = this.pickAcrossCategories(res);
        if (next.length >= 1) {
          this.pillars = next;
          this.cdr.markForCheck();
          this.queueUpdate();
        }
      },
      error: () => {
        this.pillars = this.buildFallbackPillars();
        this.cdr.markForCheck();
      },
    });
  }

  private pickAcrossCategories(payload: any): MaterialPillar[] {
    const groups = Array.isArray(payload) ? payload : [];
    const byName = new Map<string, any>();
    for (const g of groups) {
      const key = String(g?.categoryName || '').trim().toLowerCase();
      if (key) byName.set(key, g);
    }

    const ordered: any[] = [];
    const seen = new Set<string>();

    for (const name of this.categoryOrder) {
      const g = byName.get(name.toLowerCase());
      if (g) {
        ordered.push(g);
        seen.add(name.toLowerCase());
      }
    }

    for (const g of groups) {
      const key = String(g?.categoryName || '').trim().toLowerCase();
      if (key && !seen.has(key)) ordered.push(g);
    }

    const picked: MaterialPillar[] = [];
    let index = 1;

    for (const group of ordered) {
      if (picked.length >= this.maxPillars) break;

      const catName = group?.categoryName || 'Category';
      const products = (Array.isArray(group?.products) ? group.products : []).filter(
        (p: any) => !!p?.imagePath
      );
      if (!products.length) continue;

      const images = this.uniqueImages(
        products.map((p: any) => p.imagePath),
        this.maxImagesPerPillar
      );
      const product = products[0];

      picked.push({
        num: String(index).padStart(2, '0'),
        image: images[0],
        images,
        title: product.name || catName,
        titleAr: product.name_ar || product.name || catName,
        desc:
          this.cleanDesc(product.ingredients) ||
          `A signature pick from our ${catName} menu.`,
        descAr:
          this.cleanDesc(product.ingredients_ar) ||
          `اختيار مميز من قائمة ${group?.categoryName_ar || catName}.`,
        category: catName,
        categoryAr: group?.categoryName_ar || catName,
        categoryId: Number(group?.categoryId ?? product?.categoryId ?? product?.category?.id) || null,
      });
      index += 1;
    }

    return picked;
  }

  private uniqueImages(paths: string[], limit: number): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const path of paths) {
      const key = String(path || '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
      if (out.length >= limit) break;
    }
    return out;
  }

  private cleanDesc(value?: string): string {
    if (!value) return '';
    return String(value).replace(/\s+/g, ' ').replace(/\.\.+/g, '.').trim();
  }

  private buildFallbackPillars(): MaterialPillar[] {
    const withImages = (
      base: Omit<MaterialPillar, 'images'>,
      extras: string[] = []
    ): MaterialPillar => ({
      ...base,
      images: this.uniqueImages([base.image, ...extras], this.maxImagesPerPillar),
    });

    return [
      withImages(
        {
          num: '01',
          image:
            'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772444609/categories/z1g1g18lmcbqeffqduzv.png',
          title: 'Brown Sugar Milk Tea Boba',
          titleAr: 'براون شوجر ميلك تي بوبا',
          desc: 'Creamy black tea with fresh brown sugar boba.',
          descAr: 'شاي أسود كريمي مع حبوب براون شوجر فريش.',
          category: 'Milk Tea',
          categoryAr: 'ميلك تي',
          categoryId: 8,
        },
        [
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772445418/categories/spsn4omownb5l1atmtwj.png',
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772445009/categories/pbwyere0xxw9agj99s9k.png',
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772444895/categories/a6yylqur6ifgnlx9mp02.png',
        ]
      ),
      withImages(
        {
          num: '02',
          image:
            'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772445009/categories/pbwyere0xxw9agj99s9k.png',
          title: 'Matcha Mango Boba',
          titleAr: 'ماتشا مانجو بوبا',
          desc: 'Earthy matcha layered with bright mango and chewy pearls.',
          descAr: 'ماتشا غني مع مانجو منعشة ولآلئ مطاطية.',
          category: 'Matcha Classic',
          categoryAr: 'ماتشا كلاسيك',
          categoryId: 4,
        },
        [
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772444609/categories/z1g1g18lmcbqeffqduzv.png',
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772444875/categories/tnnt8qxl1ok02yq2gynl.png',
        ]
      ),
      withImages(
        {
          num: '03',
          image:
            'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772445418/categories/spsn4omownb5l1atmtwj.png',
          title: 'Chocolate Lava Boba',
          titleAr: 'شوكولاتة لافا بوبا',
          desc: 'Rich chocolate milk tea with melting chocolate notes.',
          descAr: 'ميلك تي بالشوكولاتة الغنية مع لمسة شوكولاتة سايحة.',
          category: 'Our Signature',
          categoryAr: 'توقيعنا',
          categoryId: 2,
        },
        [
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772444609/categories/z1g1g18lmcbqeffqduzv.png',
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772445309/categories/hwggjyyy3azfxtfg1b5x.png',
        ]
      ),
      withImages(
        {
          num: '04',
          image:
            'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772444895/categories/a6yylqur6ifgnlx9mp02.png',
          title: 'Mix Berries Mojito',
          titleAr: 'مكس بيريز موهيتو',
          desc: 'A refreshing berries mojito made for sunny sips.',
          descAr: 'موهيتو توت منعش مثالي لأي وقت.',
          category: 'Mojito',
          categoryAr: 'موهيتو',
          categoryId: 5,
        },
        [
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772444875/categories/tnnt8qxl1ok02yq2gynl.png',
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772445009/categories/pbwyere0xxw9agj99s9k.png',
        ]
      ),
      withImages(
        {
          num: '05',
          image:
            'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772444875/categories/tnnt8qxl1ok02yq2gynl.png',
          title: 'Peach Black Tea',
          titleAr: 'شاي أسود بالخوخ',
          desc: 'Iced black tea with ripe peach flavor.',
          descAr: 'آيس تي أسود بنكهة الخوخ الناضج.',
          category: 'Ice Tea',
          categoryAr: 'آيس تي',
          categoryId: 3,
        },
        [
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772444895/categories/a6yylqur6ifgnlx9mp02.png',
          'https://res.cloudinary.com/dvo2qoi4s/image/upload/v1772444609/categories/z1g1g18lmcbqeffqduzv.png',
        ]
      ),
    ];
  }

  private queueUpdate(): void {
    if (!this.isDesktop) return;
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.updateFromScroll();
    });
  }

  private updateFromScroll(): void {
    const el = this.sectionRef?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = el.offsetHeight - vh;
    const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 0));
    const nextProgress = total > 0 ? scrolled / total : 0;

    let nextSticky: Record<string, string>;
    if (rect.top > 0) {
      nextSticky = {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        width: '100%',
      };
    } else if (rect.bottom <= vh) {
      nextSticky = {
        position: 'absolute',
        top: 'auto',
        bottom: '0',
        left: '0',
        right: '0',
        width: '100%',
      };
    } else {
      nextSticky = {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        width: '100%',
      };
    }

    this.targetProgress = nextProgress;

    this.ngZone.run(() => {
      this.stickyStyles = nextSticky;
      this.cdr.markForCheck();
    });

    this.startLerp();
  }

  private startLerp(): void {
    if (this.lerpRaf) return;

    const tick = () => {
      const diff = this.targetProgress - this.displayProgress;
      if (Math.abs(diff) < 0.0004) {
        this.displayProgress = this.targetProgress;
        this.lerpRaf = 0;
      } else {
        this.displayProgress += diff * this.lerpFactor;
        this.lerpRaf = requestAnimationFrame(tick);
      }

      this.ngZone.run(() => {
        this.progress = this.displayProgress;
        this.cdr.markForCheck();
      });
    };

    this.lerpRaf = requestAnimationFrame(tick);
  }

  private stopLerp(): void {
    if (this.lerpRaf) {
      cancelAnimationFrame(this.lerpRaf);
      this.lerpRaf = 0;
    }
  }

  private scheduleSnap(): void {
    if (!this.isDesktop || this.snapping) return;
    if (this.snapTimer) clearTimeout(this.snapTimer);
    this.snapTimer = setTimeout(() => this.snapToNearestPanel(), 140);
  }

  private snapToNearestPanel(): void {
    const el = this.sectionRef?.nativeElement;
    if (!el || !this.isDesktop) return;

    const steps = Math.max(1, this.pillars.length - 1);
    const nearest = Math.round(this.targetProgress * steps) / steps;
    if (Math.abs(nearest - this.targetProgress) < 0.02) return;

    const vh = window.innerHeight;
    const total = Math.max(1, el.offsetHeight - vh);
    const sectionTop = el.getBoundingClientRect().top + window.scrollY;
    const targetY = sectionTop + nearest * total;

    this.snapping = true;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
    setTimeout(() => {
      this.snapping = false;
    }, 420);
  }
}
