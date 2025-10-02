import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SeoService } from 'src/app/services/seo.service';
import { TokenService } from 'src/app/services/token.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;

  loading = false;
  resending = false;

  errorMessage = '';
  successMessage = '';
  needEmailConfirmation = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private tokenService: TokenService, private seoService: SeoService,
    private loadings: LoadingService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }


  ngOnInit() {
    this.loadings.hideNow();
    this.seoService.updateTitleAndDescription(
      `Login | Bubble Hope`,
      `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
    );
  }

  onLogin() {
    this.errorMessage = '';
    this.successMessage = '';
    this.needEmailConfirmation = false;

    if (this.loginForm.invalid) {
      this.errorMessage = ' Please enter a valid email and password';
      this.loginForm.markAllAsTouched();
      return;
    }

    const loginData = this.loginForm.value;
    this.loading = true;

    this.authService.login(loginData)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          console.log(res);
          
          this.authService.signIn({ fullName: res.fullName, email: res.email });

          // حالة: محتاج تأكيد إيميل
          if (res?.success === false && res?.needEmailConfirmation) {
            this.needEmailConfirmation = true;
            this.successMessage =
              res?.message_ar || res?.message || 'حسابك غير مؤكد. تم إرسال رسالة تأكيد إلى بريدك الإلكتروني.';
            return;
          }

          // حالة: نجاح ومعانا توكن
          if (res?.token) {
            this.tokenService.storeEncryptedToken(res.token);
            this.router.navigate(['/']);
            return;
          }

          // Fallback: رسالة عامة
          this.errorMessage =
            res?.message_ar || res?.message || 'Login failed, please check your credentials';
        },
        error: (err) => {
          // 401 أو غيره
          this.errorMessage =
            err?.error?.message_ar || err?.error?.message || 'Login failed, please check your credentials';
        }
      });
  }

  // (اختياري) لو عندك Endpoint لإعادة إرسال التأكيد
  resendConfirmation() {
    this.errorMessage = '';
    this.successMessage = '';

    const email = this.loginForm.get('email')?.value;
    if (!email) {
      this.errorMessage = 'Please enter your email first.';
      return;
    }

    // لو عندك في AuthService دالة resendConfirmation(email: string)
    this.resending = true;
    this.apiService.resendConfirmation(email)
      .pipe(finalize(() => (this.resending = false)))
      .subscribe({
        next: (res) => {
          this.successMessage =
            res?.message_ar || res?.message || 'تم إرسال رسالة التأكيد مرة أخرى إلى بريدك.';
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message_ar || err?.error?.message || 'تعذر إعادة إرسال رسالة التأكيد.';
        }
      });
  }
}
