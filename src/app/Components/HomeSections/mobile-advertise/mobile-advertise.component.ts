import { Component } from '@angular/core';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-mobile-advertise',
  templateUrl: './mobile-advertise.component.html',
  styleUrls: ['./mobile-advertise.component.scss']
})
export class MobileAdvertiseComponent {
  constructor(

    public languageService: LanguageService,

  ) { }
}
