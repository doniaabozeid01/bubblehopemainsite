import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, filter, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { LanguageService } from 'src/app/services/language.service';
import { RawCategoriesService } from 'src/app/services/raw-categories.service';

/** Official group-2 categories. Each route shows that category's nested products. */
const ROUTE_SPEC: Record<string, { id: number | null; titleKey: string }> = {
  juice: { id: 20, titleKey: 'navbar.juice' },
  tapioca: { id: 21, titleKey: 'navbar.tapioca' },
  powders: { id: 21, titleKey: 'navbar.powders' },
  popping: { id: 22, titleKey: 'navbar.popping' },
  sauce: { id: null, titleKey: 'navbar.sauce' },
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
    const id = Number(product?.categoryId);
    if (id === 20) return 'bottle';
    if (id === 22) return 'pearl';
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
    this.pageTitleKey = spec?.titleKey ?? null;

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
        const cat = spec.id != null ? (cats || []).find((c) => Number(c.id) === spec.id) : null;
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
