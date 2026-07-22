import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CarouselComponent, OwlOptions } from 'ngx-owl-carousel-o';
import { ApiService } from 'src/app/services/api.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-main-categories',
  templateUrl: './main-categories.component.html',
  styleUrls: ['./main-categories.component.scss'],
})
export class MainCategoriesComponent {
  @ViewChild('catCarousel', { static: false }) catCarousel!: CarouselComponent;

  dragging = false;
  private ptrStart?: { x: number; y: number };
  private moved = false;
  private readonly dragThreshold = 10;

  catOptions: OwlOptions = {
    loop: false,
    dots: false,
    nav: false,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: true,
    freeDrag: false,
    margin: 18,
    rtl: document.documentElement.dir === 'rtl',
    responsive: {
      0: { items: 1, margin: 12 },
      576: { items: 2, margin: 14 },
      900: { items: 3, margin: 18 },
      1200: { items: 4, margin: 20 },
    },
  };

  trackById = (_: number, cat: any) => cat.id;
  categories: any;

  constructor(
    private api: ApiService,
    private router: Router,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    this.api.getAllCategories(this.api.drinks).subscribe({
      next: (res) => {
        const myOldColors = [
          '#b10000',
          '#f48b1f',
          '#2f5b3a',
          '#f4c430',
          '#8e44ad',
          '#16a085',
          '#c0392b',
          '#2980b9',
          '#d35400',
          '#27ae60',
        ];

        this.categories = res.map((c: any, index: number) => ({
          ...c,
          bgColor: myOldColors[index % myOldColors.length],
        }));
      },
    });
  }

  goToProducts(id: number) {
    this.router.navigate(['products', id]);
  }

  onPtrDown(e: PointerEvent) {
    this.ptrStart = { x: e.clientX, y: e.clientY };
    this.moved = false;
  }

  onPtrMove(e: PointerEvent) {
    if (!this.ptrStart) return;
    const dx = Math.abs(e.clientX - this.ptrStart.x);
    const dy = Math.abs(e.clientY - this.ptrStart.y);
    if (dx > this.dragThreshold || dy > this.dragThreshold) this.moved = true;
  }

  onPtrUp() {
    this.ptrStart = undefined;
  }

  onPtrCancel() {
    this.ptrStart = undefined;
    this.moved = false;
  }

  onCardClick(id: number, e: MouseEvent) {
    if (this.dragging || this.moved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.goToProducts(id);
  }
}
