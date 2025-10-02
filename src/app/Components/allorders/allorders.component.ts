import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';


@Component({
  selector: 'app-allorders',
  templateUrl: './allorders.component.html',
  styleUrls: ['./allorders.component.scss']
})
export class AllordersComponent {
 orders: any;
  isLoggedIn: boolean = true;
  showScrollButton = false;

  constructor(private api: ApiService, private route: Router, public languageService: LanguageService, private seoService: SeoService) { }

  ngOnInit() {
    this.api.GetUserId().subscribe({
      next: (res) => {
        console.log(res);
        
        this.seoService.updateTitleAndDescription(
          `Orders | Bubble Hope`,
          `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
        );


        if (!res?.userId) {
          this.isLoggedIn = false;
          return;
        }

        this.api.getOrdersByUserId(res.userId).subscribe({
          next: (response) => {
            console.log(response);
            
            this.orders = response.sort((a: any, b: any) => b.orderId - a.orderId);
          },
          error: (err) => {
            console.log(err);
            this.orders = [];
          }
        });
      },
      error: (err) => {
        this.isLoggedIn = false;
        console.log("User not logged in:", err);
      }
    });
  }




  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-warning text-dark';      // أصفر
      case 'confirmed':
        return 'bg-info text-white';        // أزرق فاتح
      case 'shipped':
        return 'bg-primary text-white';     // أزرق غامق
      case 'delivered':
        return 'bg-success text-white';     // أخضر
      case 'canceled':
        return 'bg-danger text-white';      // أحمر
      default:
        return 'bg-secondary text-white';   // رمادي افتراضي
    }
  }



  goToLogin() {
    this.route.navigate(["/auth/login"]);
  }



  goToProducts() {
    this.route.navigate(["/products"]);
  }
 @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.showScrollButton = scrollPosition > 300;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
