import { Component } from '@angular/core';
import { LanguageService } from '../../../services/language.service';

@Component({
  selector: 'app-kids-area-section',
  templateUrl: './kids-area-section.component.html',
  styleUrls: ['./kids-area-section.component.scss']
})
export class KidsAreaSectionComponent {
  constructor(public languageService: LanguageService) {}
}
