import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss']
})
export class ProductDetailsComponent {
  product: any = null;
  cartId!: number;
  usreId!: string;
  branchId!: any;

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
    const name = decodeURIComponent(this.route.snapshot.paramMap.get('name') ?? '');
    const token = localStorage.getItem('token');

    this.branchService.currentBranch$.subscribe(bid => {
      // احفظ قيمة الـ stream الأول
      this.branchId = bid;

      // fallback من localStorage لو الـ stream رجّع null
      if (this.branchId == null) {
        const br = Number(localStorage.getItem('br'));
        this.branchId = Number.isFinite(br) ? br : null;
      }

      if (!name || !this.branchId) {
        console.log('no name or branchId');  // هنا مش هتدخلي بعد التصليح
        return;
      }

      if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
        this.api.GetUserId().subscribe({
          next: (r) => {
            this.usreId = r.userId;
            this.api.GetOrCreateCart(this.usreId).subscribe({
              next: (res) => this.cartId = res.id
            });
            this.loadProduct(name);
          }
        });
      } else {
        this.loadProduct(name);
      }
    });
  }

  loadProduct(name: string) {
    if (!name?.trim() || !this.branchId) return;

    this.api.GetProductByName(name, this.branchId).subscribe({
      next: (response) => {
        this.product = response;

        this.seoService.updateTitleAndDescription(
          `${this.product?.name ?? name} | Bubble Hope`,
          `جرب مشروب ${this.product?.name ?? name} من Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
        );

        if (this.usreId) {
          this.api
            .GetProductFavouriteByUserIdAndProductId(this.usreId, this.product.id)
            .pipe(
              catchError(err => {
                // 404 معناها "مش موجود في المفضلة"
                if (err?.status === 404) return of(null);
                return of(null);
              })
            )
            .subscribe(res => {
              this.product.isFavourite = !!res;
            });
        } else {
          this.product.isFavourite = false;
        }
      },
      error: (err) => {
        console.log('Error loading product:', err);
      }
    });
  }

  addToCart(data: any) {
    const token = localStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/login'], {
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
      next: () => {
        this.toastr.success("Great choice! It's now in your cart.");
      },
      error: (err) => {
        this.toastr.error(err.error.message);
      }
    });
  }

  toggleFavourite(product: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const data = {
      productId: product.id,
      userId: this.usreId,
      branchId: this.branchId

    };

    if (product.isFavourite) {
      this.api
        .GetProductFavouriteByUserIdAndProductId(this.usreId, product.id)
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
            },
            error: (err) => console.log(err)
          });
        });
    } else {
      this.api.addToFavourite(data).subscribe({
        next: () => {
          this.toastr.success('Product Saved to your wishlist!');
          product.isFavourite = true;
        },
        error: (err) => console.log(err)
      });
    }
  }
}
