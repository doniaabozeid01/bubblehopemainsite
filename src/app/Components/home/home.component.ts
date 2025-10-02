import { Component, HostListener } from '@angular/core';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  showScrollButton = false;

  constructor(private seoService: SeoService){}

  ngOnInit(){
    this.seoService.updateTitleAndDescription(
          `Bubble Hope | مشروبات البابل تي الأصلية`,
          `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
        );
  }


    scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

    @HostListener('window:scroll', [])
    onWindowScroll() {
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      this.showScrollButton = scrollPosition > 300;
    }
}
