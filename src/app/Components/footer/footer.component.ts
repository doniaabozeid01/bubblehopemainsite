import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
  RawCategoriesService,
  RawCategoryLink,
  rawCategoryLink,
} from 'src/app/services/raw-categories.service';

const FOOTER_CATEGORY_LIMIT = 4;

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {
  categories: RawCategoryLink[] = [];

  private sub?: Subscription;

  constructor(
    private rawCategories: RawCategoriesService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.sub = this.rawCategories.getCategories().subscribe({
      next: (cats) => {
        this.categories = (cats || []).slice(0, FOOTER_CATEGORY_LIMIT).map(rawCategoryLink);
      },
      error: () => (this.categories = []),
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  categoryName(cat: RawCategoryLink): string {
    return this.translate.currentLang === 'ar' ? cat.name_ar || cat.name || '' : cat.name || '';
  }

  trackByCategory = (_: number, cat: RawCategoryLink) => cat.categoryId;
}
