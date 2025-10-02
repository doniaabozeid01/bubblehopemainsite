import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  resetForm!: FormGroup;
  token!: string;
  email!: string;
  successMessage: string = '';
  errorMessages: string[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private api: ApiService,
    private seoService: SeoService,
    private loading: LoadingService
  ) { }

  ngOnInit(): void {
    this.loading.hideNow();
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      this.email = params['email'];
    });

    this.resetForm = this.fb.group({
      newPassword: ['', Validators.required]
    });




    this.seoService.updateTitleAndDescription(
      `Reset Password | Bubble Hope`,
      `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
    );

  }

  onSubmit(): void {
    this.errorMessages = [];

    if (this.resetForm.invalid) {
      this.errorMessages.push('❗ من فضلك أدخل كلمة مرور جديدة.');
      return;
    }

    const body = {
      email: this.email,
      token: this.token,
      newPassword: this.resetForm.value.newPassword
    };

    this.api.resetPassword(body).subscribe({
      next: () => {
        this.successMessage = '✅ تم تغيير كلمة المرور بنجاح';
        this.errorMessages = [];
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        let rawErrors: string[] = [];

        if (Array.isArray(err.error)) {
          rawErrors = err.error;
        } else if (err.error && typeof err.error === 'object' && err.error.errors) {
          rawErrors = Object.values(err.error.errors).flat() as string[];
        } else if (typeof err.error === 'string') {
          rawErrors = [err.error];
        } else {
          rawErrors = [' فشل في إعادة تعيين كلمة المرور.'];
        }

        this.errorMessages = this.mapErrors(rawErrors);
        this.successMessage = '';
      }
    });
  }

  private mapErrors(errors: string[]): string[] {
    return errors.map(error => {
      if (error.includes('Passwords must have at least one lowercase')) {
        return ' يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل (a-z).';
      }
      if (error.includes('Passwords must be at least 6 characters')) {
        return ' يجب أن تكون كلمة المرور 6 أحرف على الأقل.';
      }
      if (error.includes('Passwords must have at least one uppercase')) {
        return ' يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل (A-Z).';
      }
      if (error.includes('Passwords must have at least one digit')) {
        return ' يجب أن تحتوي كلمة المرور على رقم واحد على الأقل (0-9).';
      }
      if (error.includes('Passwords must have at least one non alphanumeric character')) {
        return ' يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل (مثل: ! @ # $ %).';
      }

      // لو مفيش تطابق، نرجعها زي ما هي
      return `${error}`;
    });
  }
}
