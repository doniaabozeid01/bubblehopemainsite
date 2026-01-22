import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CarouselComponent, OwlOptions } from 'ngx-owl-carousel-o';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-best-sellers',
  templateUrl: './best-sellers.component.html',
  styleUrls: ['./best-sellers.component.scss']
})
export class BestSellersComponent {

  @ViewChild('bestCarousel', { static: false }) bestCarousel!: CarouselComponent;

  isRTL = false;
  bestSellerProducts: any[] = [];
  dragging = false;                  // 👈 نعرف لو في سحب
  cartId!: number;
  userId!: string;
  branchId!: any;

  // 1 على الصغير، 2 على التابلت، 3 على اللابتوب، 4 على الكبير
  bestOptions: OwlOptions = {
    loop: true,          // لازم عشان center يشتغل كويس
    center: true,        // 👈 الأساس
    dots: false,
    nav: false,
    margin: 280,
    mouseDrag: true,
    touchDrag: true,
    rtl: this.isRTL,
    responsive: {
      0: { items: 1, },
      576: { items: 2, },
      992: { items: 3, },   // 👈 3 عناصر = سنتر واضح
      1200: { items: 3,  }
    }
  };


  trackById = (_: number, p: any) => p.productId ?? p.id;

  constructor(
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService,
    public languageService: LanguageService,
    private branchService: BranchService
  ) { }

  ngOnInit() {
    // this.branchId = localStorage.getItem('br');

    const token = localStorage.getItem('token');

    if (token) {
      this.api.GetUserId().subscribe({
        next: (response) => {
          console.log(response);

          this.userId = response.userId;
          this.api.GetUserBranch(response.userId).subscribe({
            next: (res) => {
              console.log(res);

              this.GetBestSellerProducts(res.id, this.userId);


              this.branchService.currentBranch$.subscribe(branchId => {
                if (branchId && branchId !== this.branchId) {
                  this.branchId = branchId;
                  this.GetBestSellerProducts(branchId);
                }
              });
            },
            error: () => {
              this.bestSellerProducts = [];
            }

          })


        },
        error: () => {

          this.api.GetDefaultBranch().subscribe({
            next: (res) => {
              console.log(res);

              this.GetBestSellerProducts(res.id);
            },
            error: () => {
              this.bestSellerProducts = [];

            }
          })



        }



      });
    }
    else {
      this.api.GetDefaultBranch().subscribe({
        next: (res) => {
          this.GetBestSellerProducts(res.id);
          console.log(res);

        },
        error: () => {
          this.bestSellerProducts = [];

        }



      })

      this.branchService.currentBranch$.subscribe(branchId => {
        if (branchId && branchId !== this.branchId) {
          this.branchId = branchId;
          this.GetBestSellerProducts(branchId);
        }
      });
    }



    this.languageService.languageChanged$.subscribe(lang => {
      this.isRTL = (lang === 'ar');
      // عشان الـ rtl يتطبق بعد التغيير:
      this.bestOptions = { ...this.bestOptions, rtl: this.isRTL };
    });




  }

  GetBestSellerProducts(branchId: number, userId?: string) {
    this.api.GetBestSellerProducts(branchId, userId).subscribe({
      next: (products) => {
        console.log(products);

        this.bestSellerProducts = products
      },
      error: (err) => {
        this.bestSellerProducts = [];
        console.error('Error loading', err)
      }
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

  addToCart(data: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }





    console.log(data);

    const dataToAdded = {
      quantity: 1,
      productId: data.productId,
      branchId: this.branchId,
      userId: this.userId,
    };
    console.log(dataToAdded);


    this.api.addToCart(dataToAdded).subscribe({
      next: (response) => {
        this.toastr.success("Great choice! It's now in your cart.");

        console.log("add to cart", response);
      },
      error: (err) => {
        console.log(err);
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
      productId: item.productId,
      userId: this.userId,
      branchId: this.branchId

    };

    this.api.addToFavourite(dataToAdded).subscribe({
      next: () => {
        this.toastr.success("Product Saved to your wishlist!");

        item.isFavorite = true;
      },
      error: (err) => {
        console.log(err)
      }
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
      },
      error: (err) => console.log(err)
    });







  }


}



