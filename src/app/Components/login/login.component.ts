import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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

  @ViewChild('bgVideo') bgVideo!: ElementRef<HTMLVideoElement>;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private tokenService: TokenService,
    private seoService: SeoService,
    private loadings: LoadingService
  ) {
    this.loginForm = this.fb.group({
      // ✅ identifier بدل email
      identifier: ['', [Validators.required, this.emailOrPhoneValidator]],
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

  ngAfterViewInit() {
    if (this.bgVideo) {
      const video = this.bgVideo.nativeElement;
      video.muted = true;
      video.volume = 0;
      video.play().catch(() => {});
    }
  }

  // ✅ Validator: Email OR Egyptian phone (010/011/012/015 + 8 digits)
  emailOrPhoneValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value || '').trim();

    if (!v) return { required: true };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^01[0-2,5]\d{8}$/;

    const ok = emailRegex.test(v) || phoneRegex.test(v);
    return ok ? null : { emailOrPhone: true };
  }

  private isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test((value || '').trim());
  }

  onLogin() {
    this.errorMessage = '';
    this.successMessage = '';
    this.needEmailConfirmation = false;

    if (this.loginForm.invalid) {
      this.errorMessage = 'Please enter a valid email or phone number and password';
      this.loginForm.markAllAsTouched();
      return;
    }

    const loginData = this.loginForm.value; // ✅ { identifier, password }
    this.loading = true;

    this.authService.login(loginData)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          // مثال: تخزين بيانات المستخدم في الحالة
          this.authService.signIn({ fullName: res.fullName, email: res.email });

          // ✅ لو محتاج تأكيد ايميل (المنطق ده منطقي مع الإيميل فقط)
          if (res?.success === false && res?.needEmailConfirmation) {
            this.needEmailConfirmation = true;
            this.successMessage =
              res?.message_ar || res?.message || 'Your account is not confirmed. A confirmation email was sent.';
            return;
          }

          // ✅ نجاح ومعانا توكن
          if (res?.token) {
            this.tokenService.storeEncryptedToken(res.token);
            this.router.navigate(['/']);
            return;
          }

          // fallback
          this.errorMessage =
            res?.message_ar || res?.message || 'Login failed, please check your credentials';
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message_ar || err?.error?.message || 'Login failed, please check your credentials';
        }
      });
  }

  // ✅ Resend confirmation (Email فقط)
  resendConfirmation() {
    this.errorMessage = '';
    this.successMessage = '';

    const identifier = (this.loginForm.get('identifier')?.value || '').trim();

    if (!identifier) {
      this.errorMessage = 'Please enter your email first.';
      return;
    }

    if (!this.isEmail(identifier)) {
      this.errorMessage = 'Resend confirmation works with email only. Please enter your email.';
      return;
    }

    this.resending = true;
    this.apiService.resendConfirmation(identifier)
      .pipe(finalize(() => (this.resending = false)))
      .subscribe({
        next: (res) => {
          this.successMessage =
            res?.message_ar || res?.message || 'Confirmation email has been resent.';
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message_ar || err?.error?.message || 'Unable to resend confirmation email.';
        }
      });
  }
}
