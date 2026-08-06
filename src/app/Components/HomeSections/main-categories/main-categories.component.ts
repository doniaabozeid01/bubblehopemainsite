import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { CarouselComponent, OwlOptions, SlidesOutputData } from 'ngx-owl-carousel-o';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-main-categories',
  templateUrl: './main-categories.component.html',
  styleUrls: ['./main-categories.component.scss'],
})
export class MainCategoriesComponent implements OnInit, OnDestroy {
  @ViewChild('catCarousel', { static: false }) catCarousel!: CarouselComponent;

  dragging = false;
  activePage = 0;
  private ptrStart?: { x: number; y: number };
  private moved = false;
  private readonly dragThreshold = 10;
  private branchSub?: Subscription;
  private langSub?: Subscription;
  private pageTimer?: ReturnType<typeof setInterval>;
  private readonly pageIntervalMs = 4200;
  private readonly mobileDotWindow = 5;

  catOptions: OwlOptions = {
    loop: true,
    dots: false, // custom dots below — windowed on mobile
    nav: false,
    autoplay: false,
    smartSpeed: 650,
    slideBy: 'page',
    mouseDrag: true,
    touchDrag: true,
    pullDrag: true,
    freeDrag: false,
    margin: 18,
    rtl: document.documentElement.dir === 'rtl',
    responsive: {
      0: { items: 1, margin: 12, slideBy: 'page' },
      576: { items: 2, margin: 14, slideBy: 'page' },
      900: { items: 3, margin: 18, slideBy: 'page' },
      1200: { items: 4, margin: 20, slideBy: 'page' },
    },
  };

  trackById = (_: number, cat: any) => cat.id;
  categories: any[] = [];

  private readonly accentColors = [
    '#b10000',
    '#f48b1f',
    '#2f5b3a',
    '#f4c430',
    '#8e44ad',
    '#16a085',
    '#c0392b',
    '#2980b9',
    '#d35400',
    '#27ae60',
  ];

  constructor(
    private api: ApiService,
    private router: Router,
    private branchService: BranchService,
    public languageService: LanguageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.syncRtl();
    const branchId = this.branchService.getCurrentBranch() ?? 2;
    this.loadCategories(branchId);
    this.branchSub = this.branchService.currentBranch$.subscribe((id) => {
      if (id) this.loadCategories(id);
    });
    this.langSub = this.languageService.languageChanged$.subscribe(() => {
      this.syncRtl();
    });
  }

  ngOnDestroy(): void {
    this.branchSub?.unsubscribe();
    this.langSub?.unsubscribe();
    this.stopPageAutoplay();
  }

  get slideCount(): number {
    return this.categories?.length || 0;
  }

  get itemsPerView(): number {
    if (typeof window === 'undefined') return 1;
    const w = window.innerWidth;
    if (w >= 1200) return 4;
    if (w >= 900) return 3;
    if (w >= 576) return 2;
    return 1;
  }

  get pageCount(): number {
    const n = this.slideCount;
    if (!n) return 0;
    return Math.ceil(n / this.itemsPerView);
  }

  /** On mobile show at most 5 dots; window slides with the active page. */
  get visibleDotIndexes(): number[] {
    const total = this.pageCount;
    if (total <= 0) return [];
    const compact = typeof window !== 'undefined' && window.innerWidth < 768;
    const max = compact ? this.mobileDotWindow : total;
    if (total <= max) {
      return Array.from({ length: total }, (_, i) => i);
    }
    let start = this.activePage - Math.floor(max / 2);
    start = Math.max(0, Math.min(start, total - max));
    return Array.from({ length: max }, (_, i) => start + i);
  }

  @HostListener('window:resize')
  onResize(): void {
    const maxPage = Math.max(0, this.pageCount - 1);
    if (this.activePage > maxPage) this.activePage = maxPage;
  }

  private syncRtl(): void {
    const isAr = document.documentElement.dir === 'rtl';
    this.catOptions = { ...this.catOptions, rtl: isAr };
  }

  private loadCategories(branchId: number): void {
    this.stopPageAutoplay();
    forkJoin({
      categories: this.api.getAllCategories(this.api.drinks),
      products: this.api.GetAllProducts(branchId).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ categories, products }) => {
        const productImageByCategory = this.mapProductImagesByCategory(products, branchId);

        this.categories = (Array.isArray(categories) ? categories : []).map(
          (c: any, index: number) => ({
            ...c,
            imageUrl:
              productImageByCategory.get(Number(c.id)) ||
              productImageByCategory.get(String(c.name || '').trim().toLowerCase()) ||
              c.imageUrl,
            bgColor: this.accentColors[index % this.accentColors.length],
          })
        );
        this.activePage = 0;
        this.cdr.detectChanges();
        setTimeout(() => this.startPageAutoplay(), 120);
      },
    });
  }

  private startPageAutoplay(): void {
    this.stopPageAutoplay();
    if (this.pageCount <= 1) return;
    this.pageTimer = setInterval(() => {
      if (this.dragging) return;
      this.catCarousel?.next();
    }, this.pageIntervalMs);
  }

  private stopPageAutoplay(): void {
    if (this.pageTimer) {
      clearInterval(this.pageTimer);
      this.pageTimer = undefined;
    }
  }

  onCarouselEnter(): void {
    this.stopPageAutoplay();
  }

  onCarouselLeave(): void {
    this.startPageAutoplay();
  }

  onTranslated(event: SlidesOutputData): void {
    this.dragging = false;
    const start = event?.startPosition;
    if (typeof start !== 'number' || !this.slideCount) return;
    const rel = ((start % this.slideCount) + this.slideCount) % this.slideCount;
    this.activePage = Math.min(
      Math.floor(rel / this.itemsPerView),
      Math.max(0, this.pageCount - 1)
    );
    this.cdr.detectChanges();
  }

  goToPage(page: number): void {
    const clamped = Math.max(0, Math.min(page, this.pageCount - 1));
    const slideIndex = Math.min(clamped * this.itemsPerView, this.slideCount - 1);
    const cat = this.categories[slideIndex];
    if (!cat) return;
    this.activePage = clamped;
    this.catCarousel?.to(this.slideId(cat));
    this.startPageAutoplay();
  }

  slideId(cat: any): string {
    return `cat-${cat.id}`;
  }

  private mapProductImagesByCategory(
    payload: any,
    branchId: number
  ): Map<string | number, string> {
    const map = new Map<string | number, string>();
    const groups = Array.isArray(payload) ? payload : [];
    const pickIndex = branchId === 2 ? 0 : branchId === 3 ? 1 : branchId === 5 ? 2 : 1;

    for (const group of groups) {
      const withImage = (Array.isArray(group?.products) ? group.products : []).filter(
        (p: any) => !!p?.imagePath
      );
      if (!withImage.length) continue;

      const pick =
        withImage[pickIndex] ||
        withImage[withImage.length - 1] ||
        withImage[0];
      const image = pick.imagePath;

      const catId = Number(group?.categoryId);
      if (catId) map.set(catId, image);

      const catName = String(group?.categoryName || '')
        .trim()
        .toLowerCase();
      if (catName) map.set(catName, image);
    }

    return map;
  }

  goToProducts(id: number) {
    this.router.navigate(['products', id]);
  }

  onPtrDown(e: PointerEvent) {
    this.ptrStart = { x: e.clientX, y: e.clientY };
    this.moved = false;
  }

  onPtrMove(e: PointerEvent) {
    if (!this.ptrStart) return;
    const dx = Math.abs(e.clientX - this.ptrStart.x);
    const dy = Math.abs(e.clientY - this.ptrStart.y);
    if (dx > this.dragThreshold || dy > this.dragThreshold) this.moved = true;
  }

  onPtrUp() {
    this.ptrStart = undefined;
  }

  onPtrCancel() {
    this.ptrStart = undefined;
    this.moved = false;
  }

  onCardClick(id: number, e: MouseEvent) {
    if (this.dragging || this.moved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.goToProducts(id);
  }
}
