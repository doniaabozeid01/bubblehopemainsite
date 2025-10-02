import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LoadingService } from './services/loading.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'mainbubblehope';
  
  isLoading$: Observable<boolean>;
  
  constructor(private translate: TranslateService, loading: LoadingService) {
    translate.setDefaultLang('en'); // اللغة الافتراضية
    this.isLoading$ = loading.isLoading$;

    // translate.use('ar'); // اللغة اللي هيشتغل بيها دلوقتي
  }



}
