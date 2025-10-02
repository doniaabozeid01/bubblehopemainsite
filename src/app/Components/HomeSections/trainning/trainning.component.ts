import { Component } from '@angular/core';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-trainning',
  templateUrl: './trainning.component.html',
  styleUrls: ['./trainning.component.scss']
})
export class TrainningComponent {

  constructor(public languageService: LanguageService){}
}
