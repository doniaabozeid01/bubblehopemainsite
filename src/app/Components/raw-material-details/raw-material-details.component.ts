import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subject, combineLatest, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { CartCountService } from 'src/app/services/cart-count.service';
import { LanguageService } from 'src/app/services/language.service';
import { RawCategoriesService, asItemList, asShopProduct } from 'src/app/services/raw-categories.service';
import { SeoService } from 'src/app/services/seo.service';

type LoadState = 'idle' | 'loading' | 'success' | 'notfound' | 'error';

@Component({
  selector: 'app-raw-material-details',
  templateUrl: './raw-material-details.component.html',
  styleUrls: ['./raw-material-details.component.scss']
})
export class RawMaterialDetailsComponent implements OnDestroy {
  product: any = null;
  cartId!: number;
  usreId!: string;
  branchId!: number;
  quantity = 1;

  loadState: LoadState = 'idle';

  private destroy$ = new Subject<void>();
  private name$ = new BehaviorSubject<string>('');

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private branchService: BranchService,
    private toastr: ToastrService,
    private seoService: SeoService,
    public languageService: LanguageService,
    private rawCategories: RawCategoriesService,
    private cartCountService: CartCountService
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.name$.next(decodeURIComponent(params.get('name') ?? '').trim());
    });

    const branch$ = this.branchService.currentBranch$.pipe(
      map((bid) => (bid != null ? bid : Number(localStorage.getItem('br')))),
      filter((bid): bid is number => Number.isFinite(bid as number)),
      distinctUntilChanged()
    );

    combineLatest([branch$, this.name$])
      .pipe(
        tap(([bid]) => {
          this.branchId = bid;
          this.product = null;
          this.loadState = 'loading';
        }),
        switchMap(([bid, slug]) => this.loadProduct(bid, slug)),
        takeUntil(this.destroy$),
        shareReplay(1)
      )
      .subscribe({
        next: (res: any) => {
          if (!res || res?.__notfound) {
            this.loadState = 'notfound';
            return;
          }

          this.product = asShopProduct(res);
          this.quantity = 1;
          this.loadState = 'success';

          // SEO
          this.seoService.updateTitleAndDescription(
            `${this.product?.name || 'Product'} | Bubble Hope`,
            `جرب ${this.product?.name || ''} من Bubble Hope.`
          );

          // 4) لو المستخدم مسجّل، حضّر الكارت وتحقق من المفضلة
          const token = localStorage.getItem('token');
          const hasValidToken =
            !!token && token !== 'null' && token !== 'undefined' && token.trim() !== '';
          if (hasValidToken) {
            this.api.GetUserId().subscribe({
              next: (u) => {
                this.usreId = u.userId;


                this.api
                  .GetProductFavouriteByUserIdAndProductId(this.usreId, this.product.id,this.branchId)
                  .pipe(
                    catchError((err) => {
                      if (err?.status === 404) return of(null);
                      return of(null);
                    })
                  )
                  .subscribe((fav) => (this.product.isFavourite = !!fav));
              }
            });
          } else {
            this.product.isFavourite = false;
          }
        },
        error: (err) => {
          console.error('Error loading product:', err);
          this.loadState = 'error';
        }
      });
  }

  private loadProduct(branchId: number, slug: string) {
    if (!slug) return of({ __notfound: true });

    const byName = decodeURIComponent(slug).replace(/-/g, ' ').trim();
    const key = slug.toLowerCase();

    return this.rawCategories.getCategories().pipe(
      map((cats) => {
        const all = (cats || []).flatMap((cat) => cat['products'] || []);
        return all.find((p: any) =>
          String(p?.slug || '').toLowerCase() === key ||
          String(p?.id) === slug ||
          String(p?.name || '').toLowerCase() === byName.toLowerCase()
        ) || null;
      }),
      switchMap((found) => {
        if (found) {
          return this.api.GetProductById(found.id, branchId).pipe(
            catchError(() => of(found))
          );
        }
        return this.api.GetProductByName(byName, branchId).pipe(
          catchError(() => of({ __notfound: true }))
        );
      }),
      switchMap((res) => {
        if (!res || res?.__notfound) return of(res);
        return this.applyBranchStock(branchId, res);
      })
    );
  }

  /** Same branch-stock overlay as the listing, so Out of Stock matches. */
  private applyBranchStock(branchId: number, product: any) {
    return this.api.GetAllProductsByCategoryId(branchId, {
      groupCategoryId: this.api.rawMaterials,
    }).pipe(
      map((res) => {
        const stockItems = asItemList(res).flatMap((row: any) =>
          Array.isArray(row?.products) ? row.products : [row]
        );
        if (!stockItems.length) return { ...product, stock: Number(product?.stock ?? 0) };
        const stock = stockItems.find((p: any) => Number(p?.id) === Number(product?.id));
        return stock ? { ...product, ...stock } : { ...product, stock: 0 };
      }),
      catchError(() => of(product))
    );
  }

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  productName(p: any): string {
    return this.isRtl ? p?.name_ar || p?.name : p?.name;
  }

  categoryName(p: any): string {
    return this.isRtl
      ? p?.category?.name_ar || p?.category?.name || ''
      : p?.category?.name || '';
  }

  productDescription(p: any): string {
    return (this.isRtl ? p?.ingredients_ar || p?.ingredients : p?.ingredients || '').trim();
  }

  currencyLabel(p: any): string {
    return this.isRtl ? p?.currency_ar || 'ج.م' : p?.currency || 'LE';
  }

  get isOutOfStock(): boolean {
    return Number(this.product?.stock ?? 0) <= 0;
  }

  get maxQuantity(): number {
    const stock = Number(this.product?.stock ?? 0);
    if (!Number.isFinite(stock) || stock <= 0) return 1;
    return Math.min(99, Math.floor(stock));
  }

  get unitPrice(): number {
    const p = this.product;
    const n = Number(
      p?.newPrice ?? p?.dineInNewPrice ?? p?.oldPrice ?? p?.dineInPrice ?? p?.price ?? 0
    );
    return Number.isFinite(n) ? n : 0;
  }

  get totalPrice(): number {
    return Number((this.unitPrice * this.quantity).toFixed(2));
  }

  categoryLink(p: any): string {
    const id = Number(p?.category?.id ?? p?.categoryId);
    if (id === 20) return '/juice';
    if (id === 21) return '/tapioca';
    if (id === 22) return '/popping';
    return '/rawMaterialProducts';
  }

  goBack(p: any): void {
    this.router.navigate([this.categoryLink(p)]);
  }

  shareProduct(): void {
    const url = window.location.href;
    const title = this.product ? this.productName(this.product) : 'Bubble Hope';
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    navigator.clipboard?.writeText(url).then(() => {
      this.toastr.success('Link copied to clipboard');
    });
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) this.quantity--;
  }

  increaseQuantity(): void {
    if (this.isOutOfStock) return;
    if (this.quantity < this.maxQuantity) this.quantity++;
  }

  getImageSrc(p: any): string {
    return p?.imagePath || p?.imageUrl || p?.images?.[0]?.imagePath || '';
  }
  onImgError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'assets/img/placeholder.png';
  }

  addToCart(data: any) {
    if (this.isOutOfStock) {
      this.toastr.warning('This product is out of stock.');
      return;
    }

    const token = localStorage.getItem('token');
    const hasValidToken =
      !!token && token !== 'null' && token !== 'undefined' && token.trim() !== '';

    if (!hasValidToken) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const dataToAdded = {
      quantity: this.quantity,
      productId: data.id,
      branchId: this.branchId,
      userId: this.usreId
    };

    this.api.addToCart(dataToAdded).subscribe({
      next: () => {
        this.toastr.success("Great choice! It's now in your cart.");
        this.cartCountService.refresh(this.branchId, this.usreId);
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Failed to add to cart')
    });
  }

  toggleFavourite(product: any) {
    const token = localStorage.getItem('token');
    const hasValidToken =
      !!token && token !== 'null' && token !== 'undefined' && token.trim() !== '';

    if (!hasValidToken) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const data = {
      productId: product.id, userId: this.usreId, branchId: this.branchId
    };

    if (product.isFavourite) {
      this.api
        .GetProductFavouriteByUserIdAndProductId(this.usreId, product.id,this.branchId)
        .pipe(catchError(() => of(null)))
        .subscribe((fav: any) => {
          if (!fav?.id) {
            product.isFavourite = false;
            return;
          }
          this.api.removeFromFavourite(fav.productId, this.branchId, this.usreId).subscribe({
            next: () => {
              this.toastr.success('Product removed from your wishlist.');
              product.isFavourite = false;
            }
          });
        });
    } else {
      this.api.addToFavourite(data).subscribe({
        next: () => {
          this.toastr.success('Product Saved to your wishlist!');
          product.isFavourite = true;
        }
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
