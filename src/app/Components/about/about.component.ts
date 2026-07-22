import { Component, OnInit } from '@angular/core';
import { LoadingService } from 'src/app/services/loading.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent implements OnInit {
  readonly valueKeys = ['quality', 'joy', 'care'] as const;
  readonly valueIcons: Record<string, string> = {
    quality: 'bi bi-cup-straw',
    joy: 'bi bi-emoji-smile',
    care: 'bi bi-heart-fill',
  };

  constructor(
    private seoService: SeoService,
    private loading: LoadingService,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    this.loading.hideNow();
    this.seoService.updateTitleAndDescription(
      `About Us | Bubble Hope`,
      `Bubble Hope — joyful bubble tea moments made with quality ingredients and friendly care.`
    );
  }
}
