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
import { LanguageService } from 'src/app/services/language.service';
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
    public languageService: LanguageService
  ) { }

  ngOnInit() {
    // 1) اقرأ الاسم من الـ route مرة واحدة واضبطيه
    const raw = this.route.snapshot.paramMap.get('name') ?? '';
    // لو بتستخدمي slug زي mango-black-tea و الـ API عايز اسم بمسافات:
    const name = decodeURIComponent(raw).replace(/-/g, ' ').trim();
    this.name$.next(name);

    // 2) وفّري branchId حتى بدون لوجين (fallback من localStorage)
    const branch$ = this.branchService.currentBranch$.pipe(
      map((bid) => (bid != null ? bid : Number(localStorage.getItem('br')))),
      filter((bid): bid is number => Number.isFinite(bid as number)),
      distinctUntilChanged()
    );

    // 3) اجمع الاسم + الفرع → حمّل المنتج (switchMap يلغي الطلبات السابقة)
    combineLatest([branch$, this.name$])
      .pipe(
        tap(([bid]) => {
          this.branchId = bid;
          this.product = null;
          this.loadState = 'loading';
        }),
        switchMap(([bid, nm]) => {
          if (!nm) return of(null);
          return this.api.GetProductByName(nm, bid).pipe(
            catchError((err) => {
              // لو 404 → notfound
              if (err?.status === 404) return of({ __notfound: true });
              throw err;
            })
          );
        }),
        takeUntil(this.destroy$),
        shareReplay(1)
      )
      .subscribe({
        next: (res: any) => {
          if (!res || res?.__notfound) {
            this.loadState = 'notfound';
            return;
          }

          this.product = res;
          this.loadState = 'success';

          // SEO
          this.seoService.updateTitleAndDescription(
            `${this.product?.name ?? name} | Bubble Hope`,
            `جرب مشروب ${this.product?.name ?? name} من Bubble Hope - نكهة مميزة ومحبوبة.`
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

  // صورة آمنة (ترجع placeholder لو مفيش)
  getImageSrc(p: any): string {
    const raw = p?.images?.[0]?.imagePath;
    if (!raw) return 'assets/img/placeholder.png'; // تأكد الملف موجود فعليًا
    return raw.startsWith('http') ? raw : raw; // عدّلي هنا لو عندك baseUrl للصور
  }
  onImgError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'assets/img/placeholder.png';
  }

  addToCart(data: any) {
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
      quantity: 1,
      productId: data.id,
      branchId: this.branchId,
      userId: this.usreId
    };

    this.api.addToCart(dataToAdded).subscribe({
      next: () => this.toastr.success("Great choice! It's now in your cart."),
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
