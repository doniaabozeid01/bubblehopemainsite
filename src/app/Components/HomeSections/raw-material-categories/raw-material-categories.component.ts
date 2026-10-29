import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, filter, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { LanguageService } from 'src/app/services/language.service';
import { RawCategoriesService, rawCategoryLink } from 'src/app/services/raw-categories.service';

/** Group-2 categories, found by the navbar label the service matches from their name.
 *  `pageTitleKey` is the heading shown on the page. */
const ROUTE_SPEC: Record<string, { titleKey: string; pageTitleKey: string }> = {
  juice: { titleKey: 'navbar.juice', pageTitleKey: 'navbar.juice' },
  tapioca: { titleKey: 'navbar.tapioca', pageTitleKey: 'navbar.tapioca' },
  powders: { titleKey: 'navbar.tapioca', pageTitleKey: 'navbar.powders' },
  popping: { titleKey: 'navbar.popping', pageTitleKey: 'navbar.popping' },
  sauce: { titleKey: 'navbar.sauce', pageTitleKey: 'navbar.sauce' },
};

@Component({
  selector: 'app-raw-material-categories',
  templateUrl: './raw-material-categories.component.html',
  styleUrls: ['./raw-material-categories.component.scss'],
})
export class RawMaterialCategoriesComponent implements OnInit, OnDestroy {
  RawMaterialcategories: any[] = [];
  products: any[] = [];
  loadState: 'loading' | 'success' | 'error' = 'loading';
  isRtl = false;
  pageTitleKey: string | null = null;
  mode: 'categories' | 'products' = 'categories';

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private rawCategoriesService: RawCategoriesService,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    this.languageService.languageChanged$.pipe(takeUntil(this.destroy$)).subscribe((lang) => {
      this.isRtl = lang === 'ar';
    });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        startWith(null),
        takeUntil(this.destroy$),
        switchMap(() => this.loadPage())
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackById = (_: number, item: any) => item?.id ?? item?.slug ?? item?.name;

  categoryLabel(cat: any): string {
    return this.isRtl ? cat?.name_ar || cat?.name : cat?.name;
  }

  productLabel(product: any): string {
    return this.isRtl ? product?.name_ar || product?.name : product?.name;
  }

  packKind(product: any): 'bottle' | 'pouch' | 'pearl' {
    const key = rawCategoryLink(product?.category ?? { id: product?.categoryId }).titleKey;
    if (key === 'navbar.juice') return 'bottle';
    if (key === 'navbar.popping') return 'pearl';
    return 'pouch';
  }

  onImageError(item: any): void {
    if (item?.originalImageUrl && item.imageUrl && item.imageUrl !== item.originalImageUrl) {
      item.imageUrl = item.originalImageUrl;
      return;
    }
    item.imageUrl = '';
  }

  goToRawMaterialProducts(id: number) {
    this.router.navigate(['/rawMaterialProducts'], { queryParams: { categoryId: id } });
  }

  goToProduct(product: any) {
    const slug = product?.slug || product?.name;
    if (!slug) return;
    this.router.navigate(['rawmaterialdetails', slug]);
  }

  private currentPath(): string {
    return this.router.url.split('?')[0].replace(/^\//, '').split('/')[0];
  }

  private loadPage() {
    this.loadState = 'loading';
    this.products = [];
    const spec = ROUTE_SPEC[this.currentPath()];
    this.pageTitleKey = spec?.pageTitleKey ?? null;

    return this.rawCategoriesService.getCategories().pipe(
      switchMap((cats) => {
        if (!spec) {
          this.mode = 'categories';
          this.RawMaterialcategories = cats || [];
          this.loadState = 'success';
          return of(null);
        }

        this.mode = 'products';
        this.RawMaterialcategories = [];
        const cat = (cats || []).find((c) => c.titleKey === spec.titleKey);
        this.products = cat?.['products'] || [];
        this.loadState = 'success';
        return of(null);
      }),
      catchError(() => {
        this.loadState = 'error';
        this.RawMaterialcategories = [];
        this.products = [];
        return of(null);
      })
    );
  }
}
