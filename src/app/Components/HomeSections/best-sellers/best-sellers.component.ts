import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CarouselComponent, OwlOptions } from 'ngx-owl-carousel-o';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { WishlistCountService } from 'src/app/services/wishlist-count.service';

@Component({
  selector: 'app-best-sellers',
  templateUrl: './best-sellers.component.html',
  styleUrls: ['./best-sellers.component.scss'],
})
export class BestSellersComponent {
  @ViewChild('bestCarousel', { static: false }) bestCarousel!: CarouselComponent;

  isRTL = false;
  bestSellerProducts: any[] = [];
  dragging = false;
  cartId!: number;
  userId!: string;
  branchId!: any;

  private readonly badgeKeys = [
    'home.bestSellersBadgeFan',
    'home.bestSellersBadgeBest',
    'home.bestSellersBadgeSignature',
  ];

  bestOptions: OwlOptions = {
    loop: false,
    center: false,
    dots: true,
    nav: false,
    margin: 18,
    mouseDrag: true,
    touchDrag: true,
    rtl: this.isRTL,
    responsive: {
      0: { items: 1, margin: 12, stagePadding: 0 },
      640: { items: 2, margin: 18, stagePadding: 0 },
      992: { items: 3, margin: 20, stagePadding: 0 },
      1200: { items: 3, margin: 24, stagePadding: 0 },
    },
  };

  trackById = (_: number, p: any) => p.productId ?? p.id;

  constructor(
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService,
    public languageService: LanguageService,
    private branchService: BranchService,
    private wishlistCountService: WishlistCountService
  ) {}

  ngOnInit() {
    const token = localStorage.getItem('token');

    if (token) {
      this.api.GetUserId().subscribe({
        next: (response) => {
          this.userId = response.userId;
          this.api.GetUserBranch(response.userId).subscribe({
            next: (res) => {
              this.branchId = res.id;
              this.GetBestSellerProducts(res.id, this.userId);

              this.branchService.currentBranch$.subscribe((branchId) => {
                if (branchId && branchId !== this.branchId) {
                  this.branchId = branchId;
                  this.GetBestSellerProducts(branchId, this.userId);
                }
              });
            },
            error: () => {
              this.bestSellerProducts = [];
            },
          });
        },
        error: () => {
          this.api.GetDefaultBranch().subscribe({
            next: (res) => {
              this.branchId = res.id;
              this.GetBestSellerProducts(res.id);
            },
            error: () => {
              this.bestSellerProducts = [];
            },
          });
        },
      });
    } else {
      this.api.GetDefaultBranch().subscribe({
        next: (res) => {
          this.branchId = res.id;
          this.GetBestSellerProducts(res.id);
        },
        error: () => {
          this.bestSellerProducts = [];
        },
      });

      this.branchService.currentBranch$.subscribe((branchId) => {
        if (branchId && branchId !== this.branchId) {
          this.branchId = branchId;
          this.GetBestSellerProducts(branchId);
        }
      });
    }

    this.languageService.languageChanged$.subscribe((lang) => {
      this.isRTL = lang === 'ar';
      this.bestOptions = { ...this.bestOptions, rtl: this.isRTL };
    });
  }

  badgeKey(index: number): string {
    return this.badgeKeys[index % this.badgeKeys.length];
  }

  productShort(product: any): string {
    const isAr = this.isRTL;
    return (
      (isAr
        ? product?.shortDescription_ar ||
          product?.description_ar ||
          product?.productDescription_ar
        : product?.shortDescription ||
          product?.description ||
          product?.productDescription) || ''
    );
  }

  GetBestSellerProducts(branchId: number, userId?: string) {
    this.api.GetBestSellerProducts(branchId, userId).subscribe({
      next: (products) => {
        this.bestSellerProducts = products;
      },
      error: (err) => {
        this.bestSellerProducts = [];
        console.error('Error loading', err);
      },
    });
  }

  onProductClick(product: any, e: MouseEvent) {
    if (this.dragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.gotodetails(product);
  }

  gotodetails(product: any) {
    this.router.navigate(['productdetails/', product.productSlug]);
  }

  onAddClick(product: any, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.addToCart(product);
  }

  addToCart(data: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    const dataToAdded = {
      quantity: 1,
      productId: data.productId,
      branchId: this.branchId,
      userId: this.userId,
    };

    this.api.addToCart(dataToAdded).subscribe({
      next: () => {
        this.toastr.success("Great choice! It's now in your cart.");
      },
      error: () => {},
    });
  }

  toggleFavourite(item: any, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (item.isFavorite) {
      this.removeFromFavourite(item);
    } else {
      this.addToFavourite(item);
    }
  }

  addToFavourite(item: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    const dataToAdded = {
      productId: item.productId,
      userId: this.userId,
      branchId: this.branchId,
    };

    this.api.addToFavourite(dataToAdded).subscribe({
      next: () => {
        this.toastr.success('Product Saved to your wishlist!');
        item.isFavorite = true;
        this.wishlistCountService.increment();
      },
      error: () => {},
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

    this.api
      .removeFromFavourite(item.id, this.branchId, this.userId)
      .subscribe({
        next: () => {
          this.toastr.success('Product removed from your wishlist.');
          item.isFavorite = false;
          this.wishlistCountService.decrement();
        },
      });
  }
}
