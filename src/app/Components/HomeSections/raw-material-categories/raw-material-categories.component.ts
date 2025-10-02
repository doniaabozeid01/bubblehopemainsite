import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CarouselComponent, OwlOptions } from 'ngx-owl-carousel-o';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-raw-material-categories',
  templateUrl: './raw-material-categories.component.html',
  styleUrls: ['./raw-material-categories.component.scss']
})
export class RawMaterialCategoriesComponent {

  RawMaterialcategories:any;
  constructor(private router:Router,private api:ApiService,    public languageService: LanguageService){}
  isRtl = false;

  rawOptions: OwlOptions = {
    loop: false,
    dots: false,
    nav: false,              // لأننا بنستخدم أزرار خارجية
    mouseDrag: true,
    touchDrag: true,
    rtl: true,
    responsive: {
      0:    { items: 1, margin: 8 },
      700:  { items: 3, margin: 10 },
      1200: { items: 5, margin: 16 }
    }
  };


    ngOnInit(){
    this.api.getAllCategories(this.api.rawMaterials).subscribe({
      next:(res)=>{
        console.log(res);
        this.RawMaterialcategories = res;
        
      },
      error:(err)=>{
        console.log(err);
        
      }


    })



    this.languageService.languageChanged$.subscribe(lang => {
      
      this.isRtl = (lang === 'ar');
    });


  }


  @ViewChild('rawCarousel', { static: false }) rawCarousel!: CarouselComponent;
  trackById = (_: number, cat: any) => cat.id;

  // --- منع الفتح أثناء السحب ---
  dragging = false;
  private ptrStart?: { x: number; y: number };
  private moved = false;
  private readonly DRAG_THRESHOLD = 10;

  onPtrDown(e: PointerEvent) { this.ptrStart = { x: e.clientX, y: e.clientY }; this.moved = false; }
  onPtrMove(e: PointerEvent) {
    if (!this.ptrStart) return;
    const dx = Math.abs(e.clientX - this.ptrStart.x);
    const dy = Math.abs(e.clientY - this.ptrStart.y);
    if (dx > this.DRAG_THRESHOLD || dy > this.DRAG_THRESHOLD) this.moved = true;
  }
  onPtrUp() { this.ptrStart = undefined; }
  onPtrCancel() { this.ptrStart = undefined; this.moved = false; }

  onCardClick(id: number, e: MouseEvent) {
    if (this.dragging || this.moved) { e.preventDefault(); e.stopPropagation(); return; }
    this.goToRawMaterialProducts(id);
  }

  goToRawMaterialProducts(id: number) {
    this.router.navigate(['/rawMaterialProducts'], { queryParams: { categoryId: id } });
  }

}
