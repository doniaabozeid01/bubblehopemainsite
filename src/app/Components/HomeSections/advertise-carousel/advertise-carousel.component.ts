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

  /** Floating pearls — same idea as React FloatingPearls (bob y: 0 → -18 → 0). */
  floatingPearls = [
    { top: '18%', left: '10%', size: 42, color: '#FF7F00', duration: 6 },
    { top: '30%', left: '4%', size: 28, color: '#008B8B', duration: 5.2 },
    { top: '62%', left: '14%', size: 34, color: '#FFC340', duration: 6.5 },
    { top: '22%', left: '38%', size: 30, color: '#008B8B', duration: 5.6 },
    { top: '20%', left: '72%', size: 28, color: '#008B8B', duration: 6.2 },
    { top: '55%', left: '86%', size: 30, color: '#008B8B', duration: 5.8 },
    { top: '74%', left: '80%', size: 40, color: '#FF7F00', duration: 6.8 },
    { top: '72%', left: '40%', size: 28, color: '#FF7F00', duration: 5.4 },
    { top: '78%', left: '16%', size: 30, color: '#008B8B', duration: 6.4 },
  ];

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
        // console.log(res);

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
