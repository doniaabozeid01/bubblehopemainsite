import { Component, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, combineLatest, of } from 'rxjs';
import {
  catchError, distinctUntilChanged, filter, map, startWith,
  switchMap, takeUntil, tap
} from 'rxjs/operators';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { CartCountService } from 'src/app/services/cart-count.service';
import { LanguageService } from 'src/app/services/language.service';
import {
  RawCategoriesService,
  asItemList,
  asShopProduct,
} from 'src/app/services/raw-categories.service';
import { WishlistCountService } from 'src/app/services/wishlist-count.service';

const ROUTE_CAT: Record<string, number> = {
  juice: 20,
  tapioca: 21,
  powders: 21,
  popping: 22,
};

const PATH_BY_CAT: Record<number, string> = {
  20: '/juice',
  21: '/tapioca',
  22: '/popping',
};

/** Categories without a fixed id; matched by the navbar label the service assigns. */
const ROUTE_TITLE_KEY: Record<string, string> = {
  sauce: 'navbar.sauce',
};

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export interface RawProductGroup {
  key: string;
  name: string;
  nameAr: string;
  titleKey?: string | null;
  products: any[];
}

@Component({
  selector: 'app-raw-material-products',
  templateUrl: './raw-material-products.component.html',
  styleUrls: ['./raw-material-products.component.scss']
})
export class RawMaterialProductsComponent implements OnDestroy {
  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private branchService: BranchService,
    private toastr: ToastrService,
    public languageService: LanguageService,
    private rawCategories: RawCategoriesService,
    private cartCountService: CartCountService,
    private wishlistCountService: WishlistCountService,
    private translate: TranslateService
  ) { }

  products: any[] = [];
  groups: RawProductGroup[] = [];
  filteredGroups: RawProductGroup[] = [];
  tabs: { key: string; label: string; labelAr: string; titleKey?: string | null }[] = [];
  activeTab = 'all';
  searchQuery = '';

  cartId!: number;
  userId!: string;
  branchId!: number;
  showScrollButton = false;
  isRtl = false;
  loadState: LoadState = 'loading';

  private destroy$ = new Subject<void>();
  private searchTimer?: ReturnType<typeof setTimeout>;

  get pageTitle(): string {
    if (this.activeTab === 'all') {
      return this.isRtl ? 'الكل' : 'All';
    }
    const tab = this.tabs.find((t) => t.key === this.activeTab);
    if (tab?.titleKey) return this.translate.instant(tab.titleKey);
    return this.isRtl ? tab?.labelAr || tab?.label || '' : tab?.label || '';
  }

  productName(product: any): string {
    return this.isRtl ? product?.name_ar || product?.name : product?.name;
  }

  currencyLabel(product: any): string {
    return this.isRtl ? product?.currency_ar || 'ج.م' : product?.currency || 'LE';
  }

  tabLabel(tab: { label: string; labelAr: string; titleKey?: string | null }): string {
    if (tab.titleKey) return this.translate.instant(tab.titleKey);
    return this.isRtl ? tab.labelAr || tab.label : tab.label;
  }

  groupTitle(group: RawProductGroup): string {
    if (group.titleKey) return this.translate.instant(group.titleKey);
    return this.isRtl ? group.nameAr || group.name : group.name;
  }

  trackByTab = (_: number, tab: { key: string }) => tab.key;
  trackByGroup = (_: number, group: RawProductGroup) => group.key;
  trackByProduct = (_: number, item: any) => item.id ?? item.slug;

  ngOnInit() {
    this.loadState = 'loading';

    this.languageService.languageChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe((lang) => {
        this.isRtl = lang === 'ar';
      });

    const branch$ = this.branchService.currentBranch$.pipe(
      map(b => (b != null ? b : Number(localStorage.getItem('br')))),
      filter((b): b is number => Number.isFinite(b as number)),
      distinctUntilChanged()
    );

    const token = localStorage.getItem('token');
    const hasToken = !!token && token !== 'null' && token !== 'undefined' && token.trim() !== '';

    const start$ = hasToken
      ? this.api.GetUserId().pipe(
          tap((r) => { this.userId = r.userId; }),
          catchError(() => of(null))
        )
      : of(null);

    start$.pipe(
      switchMap(() => branch$),
      tap((b) => {
        this.branchId = b;
        this.loadState = 'loading';
      }),
      switchMap((b) => this.loadCatalog(b)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (groups) => {
        this.groups = groups;
        this.products = groups.flatMap((g) => g.products);
        this.rebuildTabs();
        this.activeTab = this.tabFromRoute();
        this.applyFilters();
        this.loadState = groups.length ? 'success' : 'error';
      },
      error: () => { this.loadState = 'error'; }
    });

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const next = this.tabFromRoute();
      if (next === this.activeTab) return;
      this.activeTab = next;
      this.applyFilters();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 120);
  }

  setActiveTab(key: string): void {
    this.activeTab = key;
    this.applyFilters();

    if (key === 'all') {
      this.router.navigate(['/rawMaterialProducts']);
      return;
    }

    const pretty = this.pathForCategory(key);
    if (pretty) {
      if (!this.router.url.startsWith(pretty)) this.router.navigate([pretty]);
      return;
    }
    this.router.navigate(['/rawMaterialProducts'], { queryParams: { categoryId: key } });
  }

  isTabActive(key: string): boolean {
    return this.activeTab === key;
  }

  private currentPath(): string {
    return this.router.url.split('?')[0].replace(/^\//, '').split('/')[0];
  }

  private pathForCategory(key: string): string | null {
    const fixed = PATH_BY_CAT[Number(key)];
    if (fixed) return fixed;
    const titleKey = this.groups.find((g) => g.key === key)?.titleKey;
    const route = Object.keys(ROUTE_TITLE_KEY).find((r) => ROUTE_TITLE_KEY[r] === titleKey);
    return route ? `/${route}` : null;
  }

  private resolveCategoryId(): number | null {
    const path = this.currentPath();
    if (path in ROUTE_CAT) return ROUTE_CAT[path];
    if (path in ROUTE_TITLE_KEY) {
      const group = this.groups.find((g) => g.titleKey === ROUTE_TITLE_KEY[path]);
      return group ? Number(group.key) : null;
    }
    const q = Number(this.route.snapshot.queryParamMap.get('categoryId'));
    return Number.isFinite(q) && q ? q : null;
  }

  private tabFromRoute(): string {
    const id = this.resolveCategoryId();
    return id != null ? String(id) : 'all';
  }

  private rebuildTabs(): void {
    this.tabs = [
      { key: 'all', label: 'All', labelAr: 'الكل' },
      ...this.groups.map((g) => ({
        key: g.key,
        label: g.name,
        labelAr: g.nameAr,
        titleKey: g.titleKey,
      })),
    ];
  }

  private applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();
    const source =
      this.activeTab === 'all'
        ? this.groups
        : this.groups.filter((g) => g.key === this.activeTab);

    this.filteredGroups = source
      .map((g) => ({
        ...g,
        products: !q
          ? g.products
          : g.products.filter((p) => {
              const name = String(p.name || '').toLowerCase();
              const nameAr = String(p.name_ar || '').toLowerCase();
              return name.includes(q) || nameAr.includes(q);
            }),
      }))
      .filter((g) => g.products.length > 0);
  }

  private loadCatalog(branchId: number) {
    return this.rawCategories.getCategories().pipe(
      map((cats) => (cats || []).map((cat) => ({
        key: String(cat.id),
        name: cat.name,
        nameAr: cat.name_ar,
        titleKey: cat.titleKey,
        products: (cat.products || []).map((p: any) => asShopProduct(p, cat)),
      }))),
      switchMap((groups) => {
        const catalog = groups.flatMap((g) => g.products);
        return this.mergeBranchStock(branchId, catalog).pipe(
          map((merged) => {
            const byId = new Map(merged.map((p) => [Number(p.id), p]));
            return groups.map((g) => ({
              ...g,
              products: g.products.map((p) => byId.get(Number(p.id)) || p),
            }));
          })
        );
      }),
      catchError(() => of([] as RawProductGroup[]))
    );
  }

  private mergeBranchStock(branchId: number, catalog: any[]) {
    return this.api.GetAllProductsByCategoryId(branchId, {
      userId: this.userId ?? undefined,
      groupCategoryId: this.api.rawMaterials,
    }).pipe(
      map((res) => {
        const stockItems = asItemList(res).flatMap((row: any) =>
          Array.isArray(row?.products) ? row.products : [row]
        );
        if (!stockItems.length) return catalog;
        const byId = new Map(stockItems.map((p: any) => [Number(p.id), p]));
        return catalog.map((p) => {
          const stock = byId.get(Number(p.id));
          if (!stock) return p;
          return asShopProduct({ ...p, ...stock }, p.category);
        });
      }),
      catchError(() => of(catalog))
    );
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    this.showScrollButton = y > 300;
  }
  scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  gotodetails(product: any) {
    this.router.navigate(['rawmaterialdetails', product.slug]);
  }

  addToCart(data: any) {
    if (Number(data?.stock ?? 0) <= 0) {
      this.toastr.warning('This product is out of stock.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const dataToAdded = {
      quantity: 1,
      productId: data.id,
      branchId: this.branchId,
      userId: this.userId
    };

    this.api.addToCart(dataToAdded).subscribe({
      next: () => {
        this.toastr.success("Great choice! It's now in your cart.");
        this.cartCountService.refresh(this.branchId, this.userId);
      },
      error: (err) => {
        this.toastr.warning(err.error?.message || 'Failed to add to cart');
      }
    });
  }

  addToFavourite(item: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const dataToAdded = {
      productId: item.id,
      userId: this.userId,
      branchId: this.branchId
    };

    this.api.addToFavourite(dataToAdded).subscribe({
      next: () => {
        this.toastr.success("Product Saved to your wishlist!");
        item.isFavorite = true;
        this.wishlistCountService.increment();
      },
      error: () => {}
    });
  }

  removeFromFavourite(item: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    this.api.removeFromFavourite(item.id, this.branchId, this.userId).subscribe({
      next: () => {
        this.toastr.success("Product removed from your wishlist.");
        item.isFavorite = false;
        this.wishlistCountService.decrement();
      },
    });
  }
}
