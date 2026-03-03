import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CarouselComponent, OwlOptions } from 'ngx-owl-carousel-o';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-main-categories',
  templateUrl: './main-categories.component.html',
  styleUrls: ['./main-categories.component.scss']
})
export class MainCategoriesComponent {




  isRtl = document.documentElement.dir === 'rtl';

  catOptions: OwlOptions = {
    loop: false,
    dots: false,
    mouseDrag: true,
    touchDrag: true,
    margin: 20,
    nav: false,                 // بنستخدم أزرار خارجية
    rtl: true,
    responsive: {
      0: { items: 1, margin: 8 },   // موبايل: عنصر واحد
      700: { items: 2, margin: 10 },   // موبايل: عنصر واحد
      1200: { items: 3, margin: 16 }   // شاشات كبيرة: 4 عناصر
    }
  };

  trackById = (_: number, cat: any) => cat.id;


  categories: any;
  constructor(
    private api: ApiService,
    private router: Router,
    public languageService: LanguageService,


  ) { }


  goToProducts(id: number) {
    this.router.navigate(['products', id]);
  }


ngOnInit() {
  this.api.getAllCategories(this.api.drinks).subscribe({
    next: (res) => {
      // دي الألوان القديمة اللي أنت كنت مختارها بالظبط
      const myOldColors = [
        '#b10000', // الأحمر (Mojito)
        '#f48b1f', // البرتقالي (Our Signature)
        '#2f5b3a', // الأخضر (Matchcha)
        '#f4c430', // الأصفر (Ice Tea)
        '#8e44ad',
        '#16a085',
        '#c0392b',
        '#2980b9',
        '#d35400',
        '#27ae60'
      ];

      this.categories = res.map((c: any, index: number) => ({
        ...c,

        bgColor: myOldColors[index % myOldColors.length]
      }));
    },
    error: (err) => console.log(err)
  });
}





  @ViewChild('catCarousel', { static: false }) catCarousel!: CarouselComponent;



  private ptrMoved = false;







  dragging = false;

  private ptrStart?: { x: number; y: number };
  private moved = false;
  private readonly DRAG_THRESHOLD = 10; // px

  onPtrDown(e: PointerEvent) {
    this.ptrStart = { x: e.clientX, y: e.clientY };
    this.moved = false;
  }

  onPtrMove(e: PointerEvent) {
    if (!this.ptrStart) return;
    const dx = Math.abs(e.clientX - this.ptrStart.x);
    const dy = Math.abs(e.clientY - this.ptrStart.y);
    if (dx > this.DRAG_THRESHOLD || dy > this.DRAG_THRESHOLD) this.moved = true;
  }

  onPtrUp() {
    // بس بنفضّي الحالة
    this.ptrStart = undefined;
  }

  onPtrCancel() {
    this.ptrStart = undefined;
    this.moved = false;
  }

  onCardClick(id: number, e: MouseEvent) {
    // لو كان فيه سحب (من owl) أو تحرّك فوق العتبة → امنع الكليك
    if (this.dragging || this.moved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.goToProducts(id);
  }



}
