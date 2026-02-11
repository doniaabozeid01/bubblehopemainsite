import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LoadingService } from './services/loading.service';
import { Observable } from 'rxjs';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'mainbubblehope';

  isLoading$: Observable<boolean>;
  isSiteEnabled: boolean | null = null;

  constructor(private translate: TranslateService, loading: LoadingService, private api: ApiService) {
    translate.setDefaultLang('en'); // اللغة الافتراضية
    this.isLoading$ = loading.isLoading$;

    this.checkSiteStatus();

    // translate.use('ar'); // اللغة اللي هيشتغل بيها دلوقتي
  }




    checkSiteStatus() {
    this.api.IsSiteOn().subscribe({
      next: (res) => this.isSiteEnabled = res,
      error: () => this.isSiteEnabled = false // fail-safe
    });
  }

}