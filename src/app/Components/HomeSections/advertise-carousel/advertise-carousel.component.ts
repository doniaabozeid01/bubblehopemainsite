import { Component, HostListener, ViewChild } from '@angular/core';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { ApiService } from 'src/app/services/api.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-advertise-carousel',
  templateUrl: './advertise-carousel.component.html',
  styleUrls: ['./advertise-carousel.component.scss']
})
export class AdvertiseCarouselComponent {
  advertisements: any[] = [];

  customOptions: OwlOptions = {
    loop: true,
    autoplay: true,
    dots: false,
    nav: false,
    rtl: true,
    items: 1,
    autoHeight: false
  };


  constructor(private api: ApiService, public languageService: LanguageService) { }

  ngOnInit() {
    this.api.GetAllAdvertisements().subscribe({
      next: (res) => {
        console.log(res);

        // ضمان أن اللي بيتحط Array
        const arr = Array.isArray(res) ? res : (res?.data || res?.result || []);
        this.advertisements = arr?.map((x: any) => ({
          id: x.id,
          imageUrl: x.imageUrl || x.url || x.image, // غطي احتمالات أسماء الخصائص
          title: x.title || ''
        })) ?? [];
        // console.log('ads:', this.advertisements);
      },
      error: (err) => console.error('Error loading carousel images', err)
    });
  }

  trackById = (_: number, item: any) => item.id ?? item.imageUrl;


@ViewChild('heroCarousel', { static: false }) heroCarousel: any;

@HostListener('window:resize')
onResize() {
  // refresh سريع
  setTimeout(() => this.heroCarousel?.refresh?.(), 50);

  // refresh بعد ما Bootstrap يطبّق d-none/d-md-flex
  setTimeout(() => this.heroCarousel?.refresh?.(), 350);
}

}
