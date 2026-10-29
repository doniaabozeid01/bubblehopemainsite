import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, catchError, of, switchMap } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { rawCategoryTitleKey } from 'src/app/services/raw-categories.service';
import { LoadingService } from 'src/app/services/loading.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';

interface HeroReel {
  type: 'image' | 'video';
  src: string;
  poster: string;
}

interface StoryName {
  name: string;
  name_ar: string;
}

/** Used when the API is unreachable, so the story card never shows empty. */
const FALLBACK_CUPS = [
  'assets/image carousel/matcha mango 1 edit.png',
  'assets/image carousel/tiger brown creme brulee edit.png',
  'assets/image carousel/black milk tea edit.png',
];

const PHOTO_MS = 3500;
const VIDEO_MAX_MS = 8000;

const reelVideo = (path: string): HeroReel => ({
  type: 'video',
  src: `assets/brand/${path}.webm`,
  poster: `assets/brand/${path}.webp`,
});

const reelPhoto = (path: string): HeroReel => ({
  type: 'image',
  src: `assets/brand/${path}.webp`,
  poster: `assets/brand/${path}.webp`,
});

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent implements OnInit, OnDestroy {
  readonly heroReels: HeroReel[] = [
    reelVideo('drinks/mango-colada-reel'),
    reelPhoto('drinks/cafe-milk-tea'),
    reelVideo('drinks/matcha-reel'),
    reelPhoto('events/branch-exterior'),
    reelVideo('events/catering-reel'),
    reelPhoto('drinks/cafe-red-bull-mojito'),
    reelVideo('events/birthday-reel'),
    reelPhoto('drinks/cafe-latte-art'),
    reelVideo('events/reem-night-reel'),
    reelPhoto('events/ahmed-samar-3'),
  ];
  heroIndex = 0;

  private heroTimer?: ReturnType<typeof setTimeout>;
  private heroPaused = false;
  private readonly reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* "Our story" card, built from the live menu */
  storyCups: string[] = [];
  storyDrinkCount = 0;
  storyCategories: StoryName[] = [];
  storyBranches: StoryName[] = [];
  isAr = false;
  private storySubs = new Subscription();

  readonly valueKeys = ['quality', 'joy', 'care'] as const;
  readonly valueIcons: Record<string, string> = {
    quality: 'bi bi-cup-straw',
    joy: 'bi bi-emoji-smile',
    care: 'bi bi-heart-fill',
  };

  constructor(
    private seoService: SeoService,
    private loading: LoadingService,
    public languageService: LanguageService,
    private api: ApiService,
    private branchService: BranchService
  ) {}

  ngOnInit() {
    this.loading.hideNow();
    this.seoService.updateTitleAndDescription(
      `About Us | Bubble Hope`,
      `Bubble Hope — joyful bubble tea moments made with quality ingredients and friendly care.`
    );
    this.scheduleNextReel();
    this.storySubs.add(
      this.languageService.languageChanged$.subscribe((lang) => (this.isAr = lang === 'ar'))
    );
    this.loadStory();
  }

  ngOnDestroy(): void {
    this.clearReelTimer();
    this.storySubs.unsubscribe();
  }

  storyLabel(item: StoryName): string {
    return this.isAr ? item.name_ar || item.name : item.name || item.name_ar;
  }

  /** Category names repeated so the marquee track can loop seamlessly. */
  get marqueeCategories(): StoryName[] {
    return [...this.storyCategories, ...this.storyCategories];
  }

  private loadStory(): void {
    this.storySubs.add(
      this.api
        .getAllBranches()
        .pipe(
          catchError(() => of([])),
          switchMap((branches: any[]) => {
            this.storyBranches = (branches || []).map((b) => ({ name: b?.name, name_ar: b?.name_ar }));
            const branchId = Number(this.branchService.getCurrentBranch()) || Number(branches?.[0]?.id);
            return branchId
              ? this.api.GetAllProducts(branchId, undefined, this.api.drinks).pipe(catchError(() => of([])))
              : of([]);
          })
        )
        .subscribe((groups: any) => this.applyMenu(Array.isArray(groups) ? groups : []))
    );
  }

  private applyMenu(groups: any[]): void {
    // Raw-material categories (syrup bottles, powders…) are not drinks, even if the
    // dashboard files them under the drinks group.
    const withProducts = groups.filter(
      (g) =>
        Array.isArray(g?.products) &&
        g.products.length &&
        !rawCategoryTitleKey({ name: g.categoryName ?? g.category?.name, name_ar: g.categoryName_ar ?? g.category?.name_ar })
    );
    this.storyCategories = withProducts.map((g) => ({
      name: g.categoryName || g.category?.name || '',
      name_ar: g.categoryName_ar || g.category?.name_ar || '',
    }));
    this.storyDrinkCount = withProducts.reduce((sum, g) => sum + g.products.length, 0);

    // One cup per category keeps the trio colourful.
    const cups: string[] = [];
    for (const g of withProducts) {
      const pick = g.products.find((p: any) => p?.imagePath && Number(p?.stock ?? 1) > 0);
      if (pick) cups.push(pick.imagePath);
      if (cups.length === 3) break;
    }
    this.storyCups = cups.length === 3 ? cups : FALLBACK_CUPS;
  }

  /** Signed distance from the active card, wrapped so the deck loops both ways. */
  reelOffset(i: number): number {
    const n = this.heroReels.length;
    let o = (i - this.heroIndex) % n;
    if (o > n / 2) o -= n;
    if (o < -n / 2) o += n;
    return o;
  }

  abs(n: number): number {
    return Math.abs(n);
  }

  goToReel(i: number): void {
    if (i === this.heroIndex) return;
    this.heroIndex = i;
    this.scheduleNextReel();
  }

  nextReel(): void {
    this.heroIndex = (this.heroIndex + 1) % this.heroReels.length;
    this.scheduleNextReel();
  }

  onReelEnded(i: number): void {
    if (i === this.heroIndex && !this.heroPaused) this.nextReel();
  }

  pauseReels(): void {
    this.heroPaused = true;
    this.clearReelTimer();
  }

  resumeReels(): void {
    this.heroPaused = false;
    this.scheduleNextReel();
  }

  private scheduleNextReel(): void {
    this.clearReelTimer();
    if (this.heroPaused || this.reducedMotion) return;
    const current = this.heroReels[this.heroIndex];
    const delay = current.type === 'video' ? VIDEO_MAX_MS : PHOTO_MS;
    this.heroTimer = setTimeout(() => this.nextReel(), delay);
  }

  private clearReelTimer(): void {
    if (this.heroTimer) {
      clearTimeout(this.heroTimer);
      this.heroTimer = undefined;
    }
  }
}
