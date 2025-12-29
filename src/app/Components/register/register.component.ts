// register.component.ts
import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ValidatorFn,
  AbstractControl
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SeoService } from 'src/app/services/seo.service';
import { TokenService } from 'src/app/services/token.service';

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
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  showPwd = false;

  errorMessage = '';
  successMessage = '';

  // dropdown lists
  countries: any[] = [];
  governorates: any[] = [];
  cities: any[] = [];
  districts: any[] = [];

  loadingCountries = false;
  loadingGovernorates = false;
  loadingCities = false;
  loadingDistricts = false;

  // نفس إعدادات السيرفر:
  private passwordPolicy: PasswordPolicy = {
    requireDigit: true,
    requireLowercase: true,
    requireUppercase: true,
    requireNonAlphanumeric: true,
    requiredLength: 8
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private tokenService: TokenService,
    private sharedService: ApiService,
    private seoService: SeoService,
    private loadings: LoadingService
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          (c: any) => (c.value?.toLowerCase().endsWith('@gmail.com') ? null : { gmailOnly: true })
        ]
      ],
      phoneNumber: [
        '',
        [
          Validators.required,
        ]
      ],
      password: ['', [Validators.required, passwordPolicyValidator(this.passwordPolicy)]],

      // ✅ backend expects nested address
      address: this.fb.group({
        countryId: [null, Validators.required],
        governorateId: [{ value: null, disabled: true }, Validators.required],
        cityId: [{ value: null, disabled: true }, Validators.required],
        districtId: [{ value: null, disabled: true }, Validators.required],
        street: [''],
        buildingNumber: [''],
        floor: [''],
        apartment: [''],
        landmark: ['']
      })
    });
  }

  ngOnInit() {
    this.loadings.hideNow();
    this.seoService.updateTitleAndDescription(
      `Register | Bubble Hope`,
      `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
    );

    this.getCountries();
    this.handleDependentSelects();
  }

  // convenience getter
  get addressFG(): FormGroup {
    return this.registerForm.get('address') as FormGroup;
  }

  private handleDependentSelects() {
    // Country -> Governorates
    this.addressFG.get('countryId')!.valueChanges.subscribe((countryId) => {
      this.governorates = [];
      this.cities = [];
      this.districts = [];

      this.addressFG.get('governorateId')!.reset(null);
      this.addressFG.get('cityId')!.reset(null);
      this.addressFG.get('districtId')!.reset(null);

      this.addressFG.get('cityId')!.disable();
      this.addressFG.get('districtId')!.disable();

      if (!countryId) {
        this.addressFG.get('governorateId')!.disable();
        return;
      }

      this.addressFG.get('governorateId')!.enable();
      this.getGovernorates(countryId);
    });

    // Governorate -> Cities
    this.addressFG.get('governorateId')!.valueChanges.subscribe((govId) => {
      this.cities = [];
      this.districts = [];

      this.addressFG.get('cityId')!.reset(null);
      this.addressFG.get('districtId')!.reset(null);

      this.addressFG.get('districtId')!.disable();

      if (!govId) {
        this.addressFG.get('cityId')!.disable();
        return;
      }

      this.addressFG.get('cityId')!.enable();
      this.getCities(govId);
    });

    // City -> Districts
    this.addressFG.get('cityId')!.valueChanges.subscribe((cityId) => {
      this.districts = [];
      this.addressFG.get('districtId')!.reset(null);

      if (!cityId) {
        this.addressFG.get('districtId')!.disable();
        return;
      }

      this.addressFG.get('districtId')!.enable();
      this.getDistricts(cityId);
    });
  }

  // ✅ عدلي الـ endpoints حسب مشروعك
  getCountries() {
    this.loadingCountries = true;
    this.sharedService
      .getAllCountries()
      .pipe(finalize(() => (this.loadingCountries = false)))
      .subscribe({
        next: (res: any) => {
          console.log(res);

          this.countries = res?.data ?? res ?? []
        },
        error: () => (this.countries = [])
      });
  }

  getGovernorates(countryId: number) {
    this.loadingGovernorates = true;
    this.sharedService
      .getGovernoratesByCountryId(countryId)
      .pipe(finalize(() => (this.loadingGovernorates = false)))
      .subscribe({
        next: (res: any) => (this.governorates = res?.data ?? res ?? []),
        error: () => (this.governorates = [])
      });
  }

  getCities(governorateId: number) {
    this.loadingCities = true;
    this.sharedService
      .getCitiesByGovernorateId(governorateId)
      .pipe(finalize(() => (this.loadingCities = false)))
      .subscribe({
        next: (res: any) => (this.cities = res?.data ?? res ?? []),
        error: () => (this.cities = [])
      });
  }

  getDistricts(cityId: number) {
    this.loadingDistricts = true;
    this.sharedService
      .getDistrictsByCityId(cityId)
      .pipe(finalize(() => (this.loadingDistricts = false)))
      .subscribe({
        next: (res: any) => (this.districts = res?.data ?? res ?? []),
        error: () => (this.districts = [])
      });
  }

  // حالات الشيك ليست (علشان الواجهة)
  get pwd() {
    return this.registerForm.get('password');
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

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.registerForm.invalid) {
      this.errorMessage = 'Please fill out all fields correctly';
      this.registerForm.markAllAsTouched();
      return;
    }

    // ✅ matches backend DTO exactly
    const data = this.registerForm.getRawValue();

    this.loading = true;

    this.authService
      .register(data)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          if (res?.success && res?.needEmailConfirmation) {
            this.successMessage =
              res.message_ar ||
              res.message ||
              'تم التسجيل بنجاح. من فضلك أكّدي بريدك الإلكتروني من الرسالة المرسلة.';
            setTimeout(() => this.router.navigate(['/auth/login']), 2000);
            return;
          }

          if (res?.token) {
            this.tokenService.storeEncryptedToken(res.token);
            localStorage.setItem('fullName', data.fullName);
            this.router.navigate(['/']);
            return;
          }

          this.successMessage = res?.message_ar || res?.message || 'تم التسجيل بنجاح، برجاء تسجيل الدخول.';
          setTimeout(() => this.router.navigate(['/auth/login']), 1500);
        },
        error: (err) => {
          if (err?.error?.errors) {
            const all = Object.values(err.error.errors).flat() as string[];
            this.errorMessage = all?.[0] || 'Registration failed, please try again';
            return;
          }
          this.errorMessage = err?.error?.message_ar || err?.error?.message || 'Registration failed, please try again';
        }
      });
  }





  @ViewChild('bgVideo') bgVideo!: ElementRef<HTMLVideoElement>;

  ngAfterViewInit() {
    if (this.bgVideo) {
      const video = this.bgVideo.nativeElement;
      video.muted = true;
      video.volume = 0;
      video.play().catch(() => { });
    }
  }

}
