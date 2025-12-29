import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SeoService } from 'src/app/services/seo.service';

type PasswordPolicy = {
  requireDigit: boolean;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireNonAlphanumeric: boolean;
  requiredLength: number;
};

function passwordPolicyValidator(policy: PasswordPolicy): ValidatorFn {
  return (control: AbstractControl) => {
    const value = (control.value || '') as string;

    const hasMinLength = value.length >= policy.requiredLength;
    const hasDigit = /\d/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNonAlnum = /[^a-zA-Z0-9]/.test(value);

    const errors: Record<string, boolean> = {};
    if (policy.requireDigit && !hasDigit) errors['requireDigit'] = true;
    if (policy.requireLowercase && !hasLower) errors['requireLowercase'] = true;
    if (policy.requireUppercase && !hasUpper) errors['requireUppercase'] = true;
    if (policy.requireNonAlphanumeric && !hasNonAlnum) errors['requireNonAlphanumeric'] = true;
    if (!hasMinLength) errors['minLengthPolicy'] = true;

    return Object.keys(errors).length ? errors : null;
  };
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  resetForm!: FormGroup;

  token = '';
  email = '';

  loading = false;
  showPwd = false;

  successMessage = '';
  errorMessages: string[] = [];

  // ✅ نفس إعدادات السيرفر/الريجيستر عندك
  private passwordPolicy: PasswordPolicy = {
    requireDigit: true,
    requireLowercase: true,
    requireUppercase: true,
    requireNonAlphanumeric: true,
    requiredLength: 8
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private seoService: SeoService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadingService.hideNow();

    this.seoService.updateTitleAndDescription(
      `Reset Password | Bubble Hope`,
      `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
    );

    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';
    });

    this.resetForm = this.fb.group({
      newPassword: [
        '',
        [Validators.required, passwordPolicyValidator(this.passwordPolicy)]
      ]
    });
  }

  // ===== Password UI helpers (for checklist) =====
  get pwd() {
    return this.resetForm.get('newPassword');
  }

  get pwdVal(): string {
    return (this.pwd?.value || '') as string;
  }

  get rule_hasMinLength() {
    return this.pwdVal.length >= this.passwordPolicy.requiredLength;
  }

  get rule_hasDigit() {
    return /\d/.test(this.pwdVal);
  }

  get rule_hasLower() {
    return /[a-z]/.test(this.pwdVal);
  }

  get rule_hasUpper() {
    return /[A-Z]/.test(this.pwdVal);
  }

  get rule_hasNonAlnum() {
    return /[^a-zA-Z0-9]/.test(this.pwdVal);
  }

  onSubmit(): void {
    this.errorMessages = [];
    this.successMessage = '';

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      this.errorMessages.push('❗ من فضلك أدخل كلمة مرور جديدة مطابقة للشروط.');
      return;
    }

    if (!this.email || !this.token) {
      this.errorMessages.push('❗ الرابط غير صالح أو منتهي. من فضلك اطلب رابط جديد.');
      return;
    }

    const body = {
      email: this.email,
      token: this.token,
      newPassword: this.resetForm.value.newPassword
    };

    this.loading = true;

    this.api
      .resetPassword(body)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.successMessage = '✅ تم تغيير كلمة المرور بنجاح';
          this.errorMessages = [];
          setTimeout(() => this.router.navigate(['/auth/login']), 2000);
        },
        error: (err) => {
          let rawErrors: string[] = [];

          if (Array.isArray(err?.error)) {
            rawErrors = err.error;
          } else if (err?.error && typeof err.error === 'object' && err.error.errors) {
            rawErrors = Object.values(err.error.errors).flat() as string[];
          } else if (typeof err?.error === 'string') {
            rawErrors = [err.error];
          } else if (err?.error?.message) {
            rawErrors = [err.error.message];
          } else {
            rawErrors = ['فشل في إعادة تعيين كلمة المرور.'];
          }

          this.errorMessages = this.mapErrors(rawErrors);
        }
      });
  }

  private mapErrors(errors: string[]): string[] {
    return errors.map((error) => {
      if (error.includes('Passwords must have at least one lowercase')) {
        return 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل (a-z).';
      }
      if (error.includes('Passwords must be at least')) {
        // لو السيرفر بيرجع 6 أو 8.. هنخليها عامة
        return `يجب أن تكون كلمة المرور ${this.passwordPolicy.requiredLength} أحرف على الأقل.`;
      }
      if (error.includes('Passwords must have at least one uppercase')) {
        return 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل (A-Z).';
      }
      if (error.includes('Passwords must have at least one digit')) {
        return 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل (0-9).';
      }
      if (error.includes('Passwords must have at least one non alphanumeric character')) {
        return 'يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل (مثل: ! @ # $ %).';
      }

      return `${error}`;
    });
  }
}
