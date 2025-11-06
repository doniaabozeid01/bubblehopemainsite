import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-favourits',
  templateUrl: './favourits.component.html',
  styleUrls: ['./favourits.component.scss']
})
export class FavouritsComponent {

  constructor(private apiService: ApiService, private router: Router, private branchService: BranchService, public languageService: LanguageService, private toastr: ToastrService, private seoService: SeoService,) { }

  wishlist: any[] = [];
  usreId!: string;
  cartId!: number;
  branchId!: any;
  trackById = (_: number, x: any) => x.id;

  ngOnInit() {

    // this.branchId = this.branchService.getCurrentBranch();
    this.branchId = localStorage.getItem('br');
    // console.log(this.branchId);

    const token = localStorage.getItem('token');

    if (token) {
      this.apiService.GetUserId().subscribe({
        next: (response) => {
          console.log(response);

          this.usreId = response.userId;
          this.GetProductFavouriteByUserId(this.usreId, this.branchId);
          // this.getOrCreateCart(this.usreId);
          this.seoService.updateTitleAndDescription(
            `Wishlist | Bubble Hope`,
            `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
          );


          const initialBranchId = Number(this.branchService.getCurrentBranch());
          if (initialBranchId) {
            this.branchId = initialBranchId;
            this.GetProductFavouriteByUserId(this.usreId, this.branchId);
          }

          this.branchService.currentBranch$.subscribe(branchId => {
            if (branchId && branchId !== this.branchId) {
              this.branchId = branchId;
              this.GetProductFavouriteByUserId(this.usreId, branchId);
            }
          });


        },
        error: (err) => {
          const initialBranchId = Number(this.branchService.getCurrentBranch());
          if (initialBranchId) {
            this.branchId = initialBranchId;
            this.GetProductFavouriteByUserId(this.usreId, this.branchId);
          }

          this.branchService.currentBranch$.subscribe(branchId => {
            if (branchId && branchId !== this.branchId) {
              this.branchId = branchId;
              this.GetProductFavouriteByUserId(this.usreId, branchId);
            }
          });
          console.log(err);
        }
      });
    }


    else {
      this.router.navigate(['/auth/login'])
    }
  }


  getDiscountedPrice(product: any): number {
    return product.oldPrice - (product.oldPrice * (product.discount / 100));
  }


  GetProductFavouriteByUserId(usreId: string, branchId: number) {
    console.log("br  : ", branchId);

    this.apiService.GetProductFavouriteByUserId(usreId, branchId).subscribe({
      next: (response) => {
        console.log(response);
        this.wishlist = response;
      },
      error: (err) => {
        console.log(err);

      }
    })

  }

  // addToCart(data: any) {
  //   const token = localStorage.getItem('token');
  //   if (!token) {
  //     this.router.navigate(['/auth/login'], {
  //       queryParams: { returnUrl: this.router.url }
  //     });
  //     return;
  //   }

  //   const dataToAdded = {
  //     quantity: 1,
  //     productId: data.productId,
  //     branchId: this.branchId,
  //     userId: this.usreId,
  //   };

  //   this.apiService.addToCart(dataToAdded).subscribe({
  //     next: (res) => {
  //       this.cartId = res.id
  //       this.toastr.success("Great choice! It's now in your cart.");
  //     },

  //     error: (err) => {
  //       this.toastr.warning(err.error.message);

  //       console.log(err);
  //     }
  //   });



  // }




  removeFromFavourite(item: any) {


    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    this.apiService.removeFromFavourite(item.productId, this.branchId, this.usreId).subscribe({
      next: (response) => {
        console.log(response);
        this.wishlist = response.data;
        // this.GetProductFavouriteByUserId(this.usreId, this.branchId);
        this.toastr.success("Product removed from your wishlist.");

      },
      error: (err) => console.log(err)
    });
  }





  goToProducts() {
    this.router.navigate(["/products"]);
  }

}
