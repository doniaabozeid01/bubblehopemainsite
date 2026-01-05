// import { Component, ElementRef, ViewChild } from '@angular/core';
// import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
// import { Router } from '@angular/router';
// import { finalize } from 'rxjs';
// import { ApiService } from 'src/app/services/api.service';
// import { AuthService } from 'src/app/services/auth.service';
// import { LoadingService } from 'src/app/services/loading.service';
// import { SeoService } from 'src/app/services/seo.service';
// import { TokenService } from 'src/app/services/token.service';


// @Component({
//   selector: 'app-login',
//   templateUrl: './login.component.html',
//   styleUrls: ['./login.component.scss']
// })
// export class LoginComponent {
//   loginForm: FormGroup;

//   loading = false;
//   resending = false;
//   errorMessage = '';
//   successMessage = '';
//   needEmailConfirmation = false;

//   @ViewChild('bgVideo') bgVideo!: ElementRef<HTMLVideoElement>;

//   constructor(
//     private fb: FormBuilder,
//     private apiService: ApiService,
//     private authService: AuthService,
//     private router: Router,
//     private tokenService: TokenService,
//     private seoService: SeoService,
//     private loadings: LoadingService
//   ) {
//     this.loginForm = this.fb.group({
//       // ✅ identifier بدل email
//       identifier: ['', [Validators.required, this.emailOrPhoneValidator]],
//       password: ['', Validators.required]
//     });
//   }

//   ngOnInit() {
//     this.loadings.hideNow();
//     this.seoService.updateTitleAndDescription(
//       `Login | Bubble Hope`,
//       `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
//     );
//   }

//   ngAfterViewInit() {
//     if (this.bgVideo) {
//       const video = this.bgVideo.nativeElement;
//       video.muted = true;
//       video.volume = 0;
//       video.play().catch(() => {});
//     }
//   }

//   // ✅ Validator: Email OR Egyptian phone (010/011/012/015 + 8 digits)
//   emailOrPhoneValidator(control: AbstractControl): ValidationErrors | null {
//     const v = (control.value || '').trim();

//     if (!v) return { required: true };

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     const phoneRegex = /^01[0-2,5]\d{8}$/;

//     const ok = emailRegex.test(v) || phoneRegex.test(v);
//     return ok ? null : { emailOrPhone: true };
//   }

//   private isEmail(value: string): boolean {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return emailRegex.test((value || '').trim());
//   }

//   onLogin() {
//     this.errorMessage = '';
//     this.successMessage = '';
//     this.needEmailConfirmation = false;

//     if (this.loginForm.invalid) {
//       this.errorMessage = 'Please enter a valid email or phone number and password';
//       this.loginForm.markAllAsTouched();
//       return;
//     }

//     const loginData = this.loginForm.value; // ✅ { identifier, password }
//     this.loading = true;

//     this.authService.login(loginData)
//       .pipe(finalize(() => (this.loading = false)))
//       .subscribe({
//         next: (res) => {
//           // مثال: تخزين بيانات المستخدم في الحالة
//           this.authService.signIn({ fullName: res.fullName, email: res.email });

//           // ✅ لو محتاج تأكيد ايميل (المنطق ده منطقي مع الإيميل فقط)
//           if (res?.success === false && res?.needEmailConfirmation) {
//             this.needEmailConfirmation = true;
//             this.successMessage =
//               res?.message_ar || res?.message || 'Your account is not confirmed. A confirmation email was sent.';
//             return;
//           }

//           // ✅ نجاح ومعانا توكن
//           if (res?.token) {
//             this.tokenService.storeEncryptedToken(res.token);
//             this.router.navigate(['/']);
//             return;
//           }

//           // fallback
//           this.errorMessage =
//             res?.message_ar || res?.message || 'Login failed, please check your credentials';
//         },
//         error: (err) => {
//           this.errorMessage =
//             err?.error?.message_ar || err?.error?.message || 'Login failed, please check your credentials';
//         }
//       });
//   }

//   // ✅ Resend confirmation (Email فقط)
//   resendConfirmation() {
//     this.errorMessage = '';
//     this.successMessage = '';

//     const identifier = (this.loginForm.get('identifier')?.value || '').trim();

//     if (!identifier) {
//       this.errorMessage = 'Please enter your email first.';
//       return;
//     }

//     if (!this.isEmail(identifier)) {
//       this.errorMessage = 'Resend confirmation works with email only. Please enter your email.';
//       return;
//     }

//     this.resending = true;
//     this.apiService.resendConfirmation(identifier)
//       .pipe(finalize(() => (this.resending = false)))
//       .subscribe({
//         next: (res) => {
//           this.successMessage =
//             res?.message_ar || res?.message || 'Confirmation email has been resent.';
//         },
//         error: (err) => {
//           this.errorMessage =
//             err?.error?.message_ar || err?.error?.message || 'Unable to resend confirmation email.';
//         }
//       });
//   }
// }

























































import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SeoService } from 'src/app/services/seo.service';
import { TokenService } from 'src/app/services/token.service';
import { PhoneAuthService } from 'src/app/services/phone-auth.service';

type Step = 'login' | 'otp';

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

  // ✅ OTP state
  step: Step = 'login';
  otpCode = '';
  otpPhoneE164 = ''; // +2010...
  otpTimer = 0;
  private timerRef: any = null;

  @ViewChild('bgVideo') bgVideo!: ElementRef<HTMLVideoElement>;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private tokenService: TokenService,
    private seoService: SeoService,
    private loadings: LoadingService,
    private phoneAuthService: PhoneAuthService
  ) {
    this.loginForm = this.fb.group({
      identifier: ['', [Validators.required, this.emailOrPhoneValidator]],
      password: [''] // validators will be set dynamically
    });

    // ✅ make password required ONLY for email
    this.loginForm.get('identifier')!.valueChanges.subscribe((v: string) => {
      const passCtrl = this.loginForm.get('password')!;
      if (this.isEmail(v)) {
        passCtrl.setValidators([Validators.required]);
      } else {
        passCtrl.clearValidators();
        passCtrl.setValue('');
      }
      passCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit() {
    this.loadings.hideNow();
    this.seoService.updateTitleAndDescription(
      `Login | Bubble Hope`,
      `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
    );

    // ✅ init recaptcha once
    // this.phoneAuthService.initRecaptcha('recaptcha-container');
  }

  ngAfterViewInit() {
    if (this.bgVideo) {
      const video = this.bgVideo.nativeElement;
      video.muted = true;
      video.volume = 0;
      video.play().catch(() => { });
    }

    // ✅ initialize Firebase reCAPTCHA AFTER view is ready
    this.phoneAuthService.initRecaptcha('recaptcha-container');
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

  isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test((value || '').trim());
  }

  private isEgyptPhone(value: string): boolean {
    const phoneRegex = /^01[0-2,5]\d{8}$/;
    return phoneRegex.test((value || '').trim());
  }

  private toE164Egypt(phone: string): string {
    phone = (phone || '').trim().replace(/\s|-/g, '');
    if (phone.startsWith('01')) return `+20${phone}`;
    if (phone.startsWith('+')) return phone;
    return phone;
  }

  // =========================
  // ✅ MAIN LOGIN BUTTON 
  // =========================
  async onLogin() {
    this.errorMessage = '';
    this.successMessage = '';
    this.needEmailConfirmation = false;

    const identifier = (this.loginForm.get('identifier')?.value || '').trim();
    const password = (this.loginForm.get('password')?.value || '').trim();

    if (!identifier) {
      this.errorMessage = 'من فضلك أدخل البريد أو رقم الهاتف';
      this.loginForm.markAllAsTouched();
      return;
    }

    // ✅ EMAIL FLOW (backend login)
    if (this.isEmail(identifier)) {
      if (!password) {
        this.errorMessage = 'كلمة المرور مطلوبة';
        return;
      }

      this.loading = true;
      this.authService.login({ identifier, password })
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (res) => {
            // لو محتاج تأكيد ايميل
            if (res?.success === false && res?.needEmailConfirmation) {
              this.needEmailConfirmation = true;
              this.successMessage = res?.message_ar || res?.message || 'تم إرسال رسالة تأكيد إلى بريدك.';
              return;
            }

            // نجاح
            if (res?.token) {
              this.authService.signIn({ fullName: res.fullName, email: res.email });
              this.tokenService.storeEncryptedToken(res.token);
              this.router.navigate(['/']);
              return;
            }

            this.errorMessage = res?.message_ar || res?.message || 'فشل تسجيل الدخول';
          },

          error: (err) => {
            this.errorMessage = err?.error?.message_ar || err?.error?.message || 'فشل تسجيل الدخول';
          }

        });
      return;
    }

    // ✅ PHONE FLOW (Firebase OTP)
    if (!this.isEgyptPhone(identifier)) {
      this.errorMessage = 'من فضلك أدخل رقم هاتف مصري صحيح (010/011/012/015...)';
      return;
    }

    try {
      this.loading = true;

      this.otpPhoneE164 = this.toE164Egypt(identifier); // +2010...
      await this.phoneAuthService.sendOtp(this.otpPhoneE164);

      this.step = 'otp';
      this.otpCode = '';
      this.successMessage = 'تم إرسال كود التحقق. من فضلك أدخله.';

      this.startOtpTimer(60);
    } catch (e: any) {
      this.errorMessage = e?.message || 'فشل إرسال كود التحقق';
    } finally {
      this.loading = false;
    }
  }

  // =========================
  // ✅ OTP VERIFY 
  // =========================
  async verifyOtpAndLogin() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.otpCode || this.otpCode.trim().length < 4) {
      this.errorMessage = 'من فضلك أدخل كود صحيح';
      return;
    }

    try {
      this.loading = true;

      const idToken = await this.phoneAuthService.verifyOtp(this.otpCode.trim());

      this.phoneAuthService.backendLogin(idToken)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (res: any) => {
            if (res?.token) {
              this.tokenService.storeEncryptedToken(res.token);
              this.router.navigate(['/']);
              return;
            }
            this.errorMessage = 'فشل تسجيل الدخول';
          },
          error: (err) => {
            this.errorMessage = err?.error?.message_ar || err?.error?.message || 'فشل تسجيل الدخول';
          }
        });

    } catch (e: any) {
      this.loading = false;
      this.errorMessage = e?.message || 'كود غير صحيح';
    }
  }

  // =========================
  // ✅ RESEND OTP
  // =========================
  async resendOtp() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.otpPhoneE164) return;

    // simple cooldown
    if (this.otpTimer > 0) {
      this.errorMessage = `انتظر ${this.otpTimer} ثانية قبل إعادة الإرسال`;
      return;
    }

    try {
      this.resending = true;
      await this.phoneAuthService.sendOtp(this.otpPhoneE164);
      this.successMessage = 'تم إعادة إرسال الكود.';
      this.startOtpTimer(60);
    } catch (e: any) {
      this.errorMessage = e?.message || 'فشل إعادة إرسال الكود';
    } finally {
      this.resending = false;
    }
  }

  changePhone() {
    this.step = 'login';
    this.otpCode = '';
    this.otpPhoneE164 = '';
    this.stopOtpTimer();
  }

  private startOtpTimer(seconds: number) {
    this.stopOtpTimer();
    this.otpTimer = seconds;
    this.timerRef = setInterval(() => {
      this.otpTimer--;
      if (this.otpTimer <= 0) this.stopOtpTimer();
    }, 1000);
  }

  private stopOtpTimer() {
    if (this.timerRef) clearInterval(this.timerRef);
    this.timerRef = null;
    this.otpTimer = 0;
  }

  // ✅ Resend confirmation (Email فقط)
  resendConfirmation() {
    this.errorMessage = '';
    this.successMessage = '';

    const identifier = (this.loginForm.get('identifier')?.value || '').trim();

    if (!identifier) {
      this.errorMessage = 'من فضلك أدخل بريدك الإلكتروني أولاً';
      return;
    }

    if (!this.isEmail(identifier)) {
      this.errorMessage = 'إعادة إرسال التأكيد تعمل بالإيميل فقط';
      return;
    }

    this.resending = true;
    this.apiService.resendConfirmation(identifier)
      .pipe(finalize(() => (this.resending = false)))
      .subscribe({
        next: (res) => {
          this.successMessage = res?.message_ar || res?.message || 'تم إرسال رسالة التأكيد مرة أخرى.';
        },
        error: (err) => {
          this.errorMessage = err?.error?.message_ar || err?.error?.message || 'تعذر إرسال رسالة التأكيد.';
        }
      });
  }
}
