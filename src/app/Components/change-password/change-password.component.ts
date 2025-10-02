import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {
  // نحتفظ بالاسم loginForm لأن الـHTML بيستخدمه
  loginForm: FormGroup;

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private seoService: SeoService,
    private loadings: LoadingService
  ) {
    this.loginForm = this.fb.group({
      oldpassword: ['', [Validators.required]],
      newpassword: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit() {
    this.loadings.hideNow();
    this.seoService.updateTitleAndDescription(
      `change password | Bubble Hope`,
      `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
    );
  }

  onLogin() {
    
    this.errorMessage = '';
    this.successMessage = '';

    if (this.loginForm.invalid) {
      this.errorMessage = 'Please enter a valid old and new password';
      this.loginForm.markAllAsTouched();
      return;
    }

    const { oldpassword, newpassword } = this.loginForm.value;

    if (oldpassword === newpassword) {
      this.errorMessage = 'New password must be different from the old password';
      return;
    }

    this.loading = true;
    this.apiService.GetUserId().subscribe({
      next: (res) => {
        console.log("res 1 => ", res);
        this.authService.getUserDetails(res.userId).subscribe({
          next: (response) => {
            console.log("res 2 => ", response);
            const body = {
              email: response.email,
              oldPassword: oldpassword,
              newPassword: newpassword
            };
            this.authService.changePassword(body)
              .pipe(finalize(() => this.loading = false))
              .subscribe({
                next: (res: any) => {
                  this.successMessage =
                    res?.message_ar || res?.message || 'تم تغيير كلمة المرور بنجاح';
                  this.loginForm.reset();
                  this.router.navigate(['/auth/login']);
                },
                error: (err) => {
                  this.errorMessage =
                    err?.error?.message_ar || err?.error?.message || 'تعذر تغيير كلمة المرور';
                }
              });
          }
        })
      },
      error: (err) => {
      }
    });

  }
}
