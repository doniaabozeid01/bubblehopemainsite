import { Component, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';
import { WishlistCountService } from 'src/app/services/wishlist-count.service';

export interface ProductGroup {
  key: string;
  name: string;
  nameAr: string;
  products: any[];
}

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnDestroy {
  products: any[] = [];
  groups: ProductGroup[] = [];
  cartId!: number;
  userId!: string;
  branchId!: number;
  showScrollButton = false;
  groupCategoryId = 1;
  loading = true;

  activeTab = 'all';
  searchQuery = '';
  searchPlaceholder = '';
  routeCategoryId: number | null = null;

  tabs: { key: string; label: string; labelAr: string }[] = [
    { key: 'all', label: 'All', labelAr: 'الكل' },
  ];
  filteredGroups: ProductGroup[] = [];

  private branchSub?: Subscription;
  private routeSub?: Subscription;
  private langSub?: Subscription;
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private branchService: BranchService,
    private toastr: ToastrService,
    public languageService: LanguageService,
    private seoService: SeoService,
    private translate: TranslateService,
    private wishlistCountService: WishlistCountService
  ) {}

  ngOnInit() {
    this.updateSearchPlaceholder();
    this.langSub = this.translate.onLangChange.subscribe(() =>
      this.updateSearchPlaceholder()
    );

    this.seoService.updateTitleAndDescription(
      `Products | Bubble Hope`,
      `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
    );

    const token = localStorage.getItem('token');

    if (token) {
      this.apiService.GetUserId().subscribe({
        next: (response) => {
          this.userId = response.userId;
          this.bindBranchAndRoute();
        },
        error: () => this.bindBranchAndRoute(),
      });
    } else {
      this.bindBranchAndRoute();
    }
  }

  ngOnDestroy(): void {
    this.branchSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    this.langSub?.unsubscribe();
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  private updateSearchPlaceholder(): void {
    this.searchPlaceholder = this.translate.instant('Products.searchPlaceholder');
  }

  private bindBranchAndRoute(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.routeCategoryId = id ? Number(id) : null;
      if (this.branchId) {
        this.loadProducts(this.branchId);
      }
    });

    this.branchSub = this.branchService.currentBranch$.subscribe((branchId) => {
      if (branchId && branchId !== this.branchId) {
        this.branchId = branchId;
        this.loadProducts(branchId);
        return;
      }

      if (!branchId && !this.branchId) {
        this.apiService.GetDefaultBranch().subscribe({
          next: (res) => {
            const id = Number(res?.id);
            if (!id || id === this.branchId) return;
            this.branchService.setBranch(id);
          },
          error: () => {
            this.loading = false;
            this.groups = [];
            this.products = [];
            this.filteredGroups = [];
            this.rebuildTabs();
          },
        });
      }
    });
  }

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 120);
  }

  setActiveTab(key: string): void {
    this.activeTab = key;
    this.applyFilters();
  }

  trackByTab = (_: number, tab: { key: string }) => tab.key;
  trackByGroup = (_: number, group: ProductGroup) => group.key;
  trackByProduct = (_: number, item: any) => item.id ?? item.slug;

  tabLabel(tab: { key: string; label: string; labelAr: string }): string {
    return this.isRtl ? tab.labelAr || tab.label : tab.label;
  }

  groupTitle(group: ProductGroup): string {
    return this.isRtl ? group.nameAr || group.name : group.name;
  }

  productName(item: any): string {
    return this.isRtl ? item.name_ar || item.name : item.name;
  }

  currencyLabel(item: any): string {
    return this.isRtl ? item.currency_ar || item.currency : item.currency;
  }

  private rebuildTabs(): void {
    this.tabs = [
      { key: 'all', label: 'All', labelAr: 'الكل' },
      ...this.groups.map((g) => ({
        key: g.key,
        label: g.name,
        labelAr: g.nameAr,
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

  private enrichProduct(p: any): any {
    const n = Number(p?.newPrice ?? p?.oldPrice ?? 0);
    let badge: string | null = null;
    if (p.stock > 0) {
      if (p.discount > 0) badge = `-${p.discount}%`;
      else if (p.badge) badge = String(p.badge);
      else if (p.isBestSeller) badge = 'BESTSELLER';
    }
    p._price = Number.isFinite(n) ? n : 0;
    p._badge = badge;
    return p;
  }

  loadProducts(branchId: number): void {
    this.loading = true;
    this.apiService
      .GetAllProducts(Number(branchId), this.userId, this.groupCategoryId)
      .subscribe({
        next: (res) => {
          this.normalizeProducts(res);
          this.loading = false;
        },
        error: () => {
          this.groups = [];
          this.products = [];
          this.filteredGroups = [];
          this.rebuildTabs();
          this.loading = false;
        },
      });
  }

  private normalizeProducts(res: any): void {
    if (!Array.isArray(res) || res.length === 0) {
      this.groups = [];
      this.products = [];
      this.filteredGroups = [];
      this.rebuildTabs();
      return;
    }

    const isGrouped =
      res[0]?.categoryName != null && Array.isArray(res[0]?.products);

    if (isGrouped) {
      this.groups = res.map((item: any, index: number) => {
        const name = item.categoryName || item.category?.name || `Category ${index + 1}`;
        const nameAr = item.categoryName_ar || item.category?.name_ar || name;
        const id = item.categoryId ?? item.category?.id ?? name;
        const products = (Array.isArray(item.products) ? item.products : []).map((p: any) =>
          this.enrichProduct(p)
        );
        return {
          key: String(id),
          name,
          nameAr,
          products,
        };
      });
    } else {
      const cat = res[0]?.category;
      const name = cat?.name || res[0]?.categoryName || 'Menu';
      const nameAr = cat?.name_ar || res[0]?.categoryName_ar || name;
      const id = cat?.id ?? this.routeCategoryId ?? name;
      this.groups = [
        {
          key: String(id),
          name,
          nameAr,
          products: res.map((p: any) => this.enrichProduct(p)),
        },
      ];
    }

    this.products = this.groups.flatMap((g) => g.products);
    this.rebuildTabs();

    if (this.routeCategoryId != null) {
      const match = this.groups.find((g) => g.key === String(this.routeCategoryId));
      this.activeTab = match ? match.key : 'all';
    } else if (
      this.activeTab !== 'all' &&
      !this.groups.some((g) => g.key === this.activeTab)
    ) {
      this.activeTab = 'all';
    }

    this.applyFilters();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    this.showScrollButton = scrollPosition > 300;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addToFavourite(item: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.apiService
      .addToFavourite({
        productId: item.id,
        userId: this.userId,
        branchId: this.branchId,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Product Saved to your wishlist!');
          item.isFavorite = true;
          this.wishlistCountService.increment();
        },
      });
  }

  removeFromFavourite(item: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.apiService
      .removeFromFavourite(item.id, this.branchId, this.userId)
      .subscribe({
        next: () => {
          this.toastr.success('Product removed from your wishlist.');
          item.isFavorite = false;
          this.wishlistCountService.decrement();
        },
      });
  }

  gotodetails(product: any) {
    this.router.navigate(['productdetails/', product.slug], {
      queryParams: this.routeCategoryId ? { categoryId: this.routeCategoryId } : {},
    });
  }

  quickAdd(item: any, event: Event): void {
    event.stopPropagation();
    if (item.stock <= 0) return;
    this.gotodetails(item);
  }

  toggleFavourite(item: any, event: Event): void {
    event.stopPropagation();
    if (item.isFavorite) {
      this.removeFromFavourite(item);
    } else {
      this.addToFavourite(item);
    }
  }
}
