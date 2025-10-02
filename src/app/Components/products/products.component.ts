import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent {

  constructor(private apiService: ApiService, private route: ActivatedRoute, private router: Router, private branchService: BranchService, private toastr: ToastrService, public languageService: LanguageService, private seoService: SeoService) { }

  products: any;
  cartId!: number;
  userId!: string;
  full: boolean = true;
  branchId!: number;
  showScrollButton = false;
  groupCategoryId:number = 1;

  ngOnInit() {
    const token = localStorage.getItem('token');
    this.seoService.updateTitleAndDescription(
      `Products | Bubble Hope`,
      `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
    );
    if (token) {
      this.apiService.GetUserId().subscribe({
        next: (response) => {
          this.userId = response.userId;
          const initialBranchId = Number(this.branchService.getCurrentBranch());
          if (initialBranchId) {
            this.branchId = initialBranchId;
            this.loadProducts(initialBranchId);
          }

          this.branchService.currentBranch$.subscribe(branchId => {
            if (branchId && branchId !== this.branchId) {
              this.branchId = branchId;
              this.loadProducts(branchId);
            }
          });
        },

        error: (err) => {
          const initialBranchId = Number(this.branchService.getCurrentBranch());
          if (initialBranchId) {
            this.branchId = initialBranchId;
            this.loadProducts(initialBranchId);
          }

          this.branchService.currentBranch$.subscribe(branchId => {
            if (branchId && branchId !== this.branchId) {
              this.branchId = branchId;
              this.loadProducts(branchId);
            }
          });
        }
      });
    }

    else {
      const initialBranchId = Number(this.branchService.getCurrentBranch());
      if (initialBranchId) {
        this.branchId = initialBranchId;
        this.loadProducts(initialBranchId);
      }

      this.branchService.currentBranch$.subscribe(branchId => {
        if (branchId && branchId !== this.branchId) {
          this.branchId = branchId;
          this.loadProducts(branchId);
        }
      });
    }


  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.showScrollButton = scrollPosition > 300;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  loadProducts(branchId: number) {
    this.route.paramMap.subscribe(params => {
      const categoryId = params.get('id');
      console.log('📦 Loading products for branch:', branchId, 'category:', categoryId);

      if (categoryId) {
        this.full = false;
        this.GetAllProductsByCategoryId(branchId, Number(categoryId), this.userId, this.groupCategoryId);
      } else {
        this.full = true;
        this.GetAllProducts(branchId, this.userId, this.groupCategoryId);
      }
    });
  }


  selectIdFromPathIfExist(branchId: number) {
    console.log("1", branchId);

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      console.log("id : ", id);
      if (id) {
        this.full = false;
        this.GetAllProductsByCategoryId(branchId, Number(id), this.userId);
      } else {
        this.GetAllProducts(branchId, this.userId, this.groupCategoryId );
      }
    });
  }


  GetDefaultBranch() {
    this.apiService.GetDefaultBranch().subscribe({
      next: (response) => {
        console.log("Default Branch : ", response);
        this.branchId = response.id;
        this.selectIdFromPathIfExist(this.branchId);
      },
      error: (err) => {
        console.log(err);
      }
    })

  }




  GetAllProducts(branchID: number, userId?: string , groupCategoryId?: number) {

    this.apiService.GetAllProducts(Number(branchID), userId, groupCategoryId).subscribe({
      next: (productsResponse) => {
        console.log(productsResponse);
        this.products = productsResponse;
      },
      error: (err) => console.log(err)
    });
  }





  GetAllProductsByCategoryId(branchID: number, categoryId?: number, userId?: string, groupCategoryId?: number) {

    console.log("branch : ", branchID);

    this.apiService.GetAllProductsByCategoryId(Number(branchID), {categoryId, userId, groupCategoryId} ).subscribe({
      next: (productsResponse) => {
        console.log(productsResponse);
        this.products = productsResponse;

      },
      error: (err) => console.log(err)
    });
  }



  addToCart(data: any) {
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
      userId: this.userId,
    };

    this.apiService.addToCart(dataToAdded).subscribe({
      next: (res) => {
        this.cartId = res.id
        this.toastr.success("Great choice! It's now in your cart.");
      },

      error: (err) => {
        this.toastr.warning(err.error.message);

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
      productId: item.id,
      userId: this.userId,
      branchId: this.branchId
    };

    this.apiService.addToFavourite(dataToAdded).subscribe({
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
    console.log(item);

    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }


    this.apiService.removeFromFavourite(item.id, this.branchId, this.userId).subscribe({
      next: () => {
        this.toastr.success("Product removed from your wishlist.");

        item.isFavorite = false;
      },
      error: (err) => console.log(err)
    });

    console.log(item);





  }

  gotodetails(product: any) {
    this.router.navigate(['productdetails/', product.slug]);
  }


    
}
