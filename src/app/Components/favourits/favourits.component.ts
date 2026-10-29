import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';
import { WishlistCountService } from 'src/app/services/wishlist-count.service';

@Component({
  selector: 'app-favourits',
  templateUrl: './favourits.component.html',
  styleUrls: ['./favourits.component.scss'],
})
export class FavouritsComponent {
  wishlist: any[] = [];
  usreId!: string;
  cartId!: number;
  branchId!: any;
  loading = true;
  trackById = (_: number, x: any) => x.id ?? x.productId;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private branchService: BranchService,
    public languageService: LanguageService,
    private toastr: ToastrService,
    private seoService: SeoService,
    private wishlistCountService: WishlistCountService
  ) {}

  ngOnInit() {
    this.branchId = localStorage.getItem('br');
    const token = localStorage.getItem('token');

    if (!token) {
      this.loading = false;
      this.router.navigate(['/home']);
      return;
    }

    this.apiService.GetUserId().subscribe({
      next: (response) => {
        this.usreId = response.userId;
        this.seoService.updateTitleAndDescription(
          `Wishlist | Bubble Hope`,
          `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
        );

        const initialBranchId = Number(this.branchService.getCurrentBranch());
        if (initialBranchId) {
          this.branchId = initialBranchId;
          this.GetProductFavouriteByUserId(this.usreId, this.branchId);
        } else if (this.branchId) {
          this.GetProductFavouriteByUserId(this.usreId, this.branchId);
        } else {
          this.loading = false;
        }

        this.branchService.currentBranch$.subscribe((branchId) => {
          if (branchId && branchId !== this.branchId) {
            this.branchId = branchId;
            this.GetProductFavouriteByUserId(this.usreId, branchId);
          }
        });
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/home']);
      },
    });
  }

  productName(item: any): string {
    const isAr =
      (this.languageService as any).translate?.currentLang === 'ar' ||
      document.documentElement.dir === 'rtl';
    return isAr ? item?.name_ar || item?.name : item?.name;
  }

  currencyLabel(item: any): string {
    const isAr =
      (this.languageService as any).translate?.currentLang === 'ar' ||
      document.documentElement.dir === 'rtl';
    return isAr ? item?.currency_ar || item?.currency : item?.currency;
  }

  displayPrice(item: any): number {
    return Number(item?.newPrice || this.getDiscountedPrice(item) || item?.oldPrice || 0);
  }

  getDiscountedPrice(product: any): number {
    if (!product?.oldPrice) return 0;
    return product.oldPrice - product.oldPrice * ((product.discount || 0) / 100);
  }

  GetProductFavouriteByUserId(usreId: string, branchId: number) {
    this.loading = true;
    this.wishlist = [];
    this.wishlistCountService.loadForBranch(usreId, branchId).subscribe({
      next: (list) => {
        if (Number(branchId) !== Number(this.branchId)) return;
        this.wishlist = list;
        this.wishlistCountService.setCount(this.wishlist.length);
        this.loading = false;
      },
      error: () => {
        this.wishlist = [];
        this.wishlistCountService.setCount(0);
        this.loading = false;
      },
    });
  }

  removing = new Set<number>();

  removeFromFavourite(item: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/home']);
      return;
    }
    if (this.removing.has(item.productId)) return;
    this.removing.add(item.productId);

    this.removeInAnyBranch(item.productId, item.branchId ?? this.branchId)
      .subscribe({
        next: (response) => {
          this.removing.delete(item.productId);
          this.wishlist = this.wishlist.filter((x) => x.productId !== item.productId);
          this.wishlistCountService.setCount(this.wishlist.length);
          this.toastr.success('Product removed from your wishlist.');
        },
        error: (err) => {
          this.removing.delete(item.productId);
          this.toastr.error(err?.error?.message || "Couldn't remove this product. Please try again.");
          if (err?.status === 404) this.GetProductFavouriteByUserId(this.usreId, this.branchId);
        },
      });
  }

  /**
   * The list shows favourites saved in any branch, but delete only matches the branch the
   * item was saved in. Try the current branch first, then the others until one has it.
   */
  private removeInAnyBranch(productId: number, firstBranch: number): Observable<any> {
    const first = Number(firstBranch);
    return this.apiService.getAllBranches().pipe(
      catchError(() => of([])),
      map((res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        const others = list.map((b: any) => Number(b?.id)).filter((id: number) => id && id !== first);
        return [first, ...others];
      }),
      switchMap((ids: number[]) => this.removeFromBranches(productId, ids))
    );
  }

  private removeFromBranches(productId: number, ids: number[]): Observable<any> {
    const [id, ...rest] = ids;
    return this.apiService.removeFromFavourite(productId, id, this.usreId).pipe(
      catchError((err) =>
        err?.status === 404 && rest.length
          ? this.removeFromBranches(productId, rest)
          : throwError(() => err)
      )
    );
  }

  goToProducts() {
    this.router.navigate(['/products']);
  }
}
