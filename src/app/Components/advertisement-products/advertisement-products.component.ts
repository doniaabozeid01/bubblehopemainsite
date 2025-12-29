import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-advertisement-products',
  templateUrl: './advertisement-products.component.html',
  styleUrls: ['./advertisement-products.component.scss']
})
export class AdvertisementProductsComponent {


   constructor(private apiService: ApiService, private route: ActivatedRoute, private router: Router, private branchService: BranchService, private toastr: ToastrService, public languageService: LanguageService, private seoService: SeoService) { }
  
    products: any;
    cartId!: number;
    userId!: string;
    branchId!: number;
advertisementId:number=0;
  
    ngOnInit() {

      const token = localStorage.getItem('token');
      this.seoService.updateTitleAndDescription(
        `Offers | Bubble Hope`,
        `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
      );

      this.advertisementId = Number(this.route.snapshot.paramMap.get('id')) ?? 0;

      if (token) {
        this.apiService.GetUserId().subscribe({
          next: (response) => {
            this.userId = response.userId;
            const initialBranchId = Number(this.branchService.getCurrentBranch());
            if (initialBranchId) {
              this.branchId = initialBranchId;
              this.loadProducts(this.advertisementId,initialBranchId);
            }
  
            this.branchService.currentBranch$.subscribe(branchId => {
              if (branchId && branchId !== this.branchId) {
                this.branchId = branchId;
                this.loadProducts(this.advertisementId, branchId);
              }
            });
          },
  
          error: (err) => {
            const initialBranchId = Number(this.branchService.getCurrentBranch());
            if (initialBranchId) {
              this.branchId = initialBranchId;
              this.loadProducts(this.advertisementId, initialBranchId);
            }
  
            this.branchService.currentBranch$.subscribe(branchId => {
              if (branchId && branchId !== this.branchId) {
                this.branchId = branchId;
                this.loadProducts(this.advertisementId, branchId);
              }
            });
          }
        });
      }
  
      else {
        const initialBranchId = Number(this.branchService.getCurrentBranch());
        if (initialBranchId) {
          this.branchId = initialBranchId;
          this.loadProducts(this.advertisementId, initialBranchId);
        }
  
        this.branchService.currentBranch$.subscribe(branchId => {
          if (branchId && branchId !== this.branchId) {
            this.branchId = branchId;
            this.loadProducts(this.advertisementId, branchId);
          }
        });
      }
  
  
    }


  
  

  
  
    GetDefaultBranch() {
      this.apiService.GetDefaultBranch().subscribe({
        next: (response) => {
          console.log("Default Branch : ", response);
          this.branchId = response.id;
          this.loadProducts(this.advertisementId, this.branchId);
        },
        error: (err) => {
          console.log(err);
        }
      })
  
    }
  
  
    loadProducts(advertisementId:number, branchId: number) {
      this.apiService.GetProductsByAdvertisementId(advertisementId, branchId).subscribe({
        next: (productsResponse) => {
          console.log(productsResponse);
          this.products = productsResponse;
        },
        error: (err) => console.log(err)
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
