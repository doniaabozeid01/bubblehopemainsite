import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from 'src/app/services/language.service';
import { RawCategoriesService } from 'src/app/services/raw-categories.service';

@Component({
  selector: 'app-raw-material-categories',
  templateUrl: './raw-material-categories.component.html',
  styleUrls: ['./raw-material-categories.component.scss']
})
export class RawMaterialCategoriesComponent implements OnInit {

  RawMaterialcategories: any[] = [];
  loadState: 'loading' | 'success' | 'error' = 'loading';
  isRtl = false;

  constructor(
    private router: Router,
    private rawCategoriesService: RawCategoriesService,
    public languageService: LanguageService
  ) { }

  ngOnInit() {
    this.loadState = 'loading';
    this.rawCategoriesService.getCategories().subscribe({
      next: (res) => {
        this.RawMaterialcategories = res || [];
        this.loadState = 'success';
      },
      error: () => {
        this.RawMaterialcategories = [];
        this.loadState = 'error';
      }
    });

    this.languageService.languageChanged$.subscribe(lang => {
      this.isRtl = (lang === 'ar');
    });
  }

  trackById = (_: number, cat: any) => cat?.id ?? cat?.name;

  /** Fall back to the raw dashboard image if the background-stripped one fails. */
  onImageError(cat: any): void {
    if (cat?.originalImageUrl && cat.imageUrl !== cat.originalImageUrl) {
      cat.imageUrl = cat.originalImageUrl;
    }
  }

  goToRawMaterialProducts(id: number) {
    this.router.navigate(['/rawMaterialProducts'], { queryParams: { categoryId: id } });
  }

}
