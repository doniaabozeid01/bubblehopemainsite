import { Component } from '@angular/core';
import { LoadingService } from 'src/app/services/loading.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {

  constructor(private seoService: SeoService,
    private loading: LoadingService){}

  ngOnInit(){

    this.loading.hideNow();
    this.seoService.updateTitleAndDescription(
          `About Us | Bubble Hope`,
          `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
        );
  }
}
