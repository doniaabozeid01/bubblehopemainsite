// register.component.ts
import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ValidatorFn,
  AbstractControl
} from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription, finalize } from 'rxjs';
import { BhSelectOption } from '../bh-select/bh-select.component';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { LanguageService } from 'src/app/services/language.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SeoService } from 'src/app/services/seo.service';
import { TokenService } from 'src/app/services/token.service';
import { KNOWN_AREAS, KnownArea } from './known-areas';

const AREA_PREFIX = 'area:';
const normalizeName = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();

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

/** Keeps only rows that point at the chosen parent; rows without the field are trusted. */
function belongingTo(list: any[], parentKey: string, parentId: number): any[] {
  return (Array.isArray(list) ? list : []).filter(
    (item) => item?.[parentKey] == null || Number(item[parentKey]) === Number(parentId)
  );
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
  /** Street, building, floor, apartment and landmark are optional, so they start folded away. */
  showAddressDetails = false;

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

  countryOptions: BhSelectOption[] = [];
  governorateOptions: BhSelectOption[] = [];
  cityOptions: BhSelectOption[] = [];
  districtOptions: BhSelectOption[] = [];

  /**
   * What the District list shows: a real district id, or a well-known area (`area:<name>`)
   * that is not a district in the dashboard yet. Kept apart from `districtId`, which only
   * ever holds an id the backend knows.
   */
  districtChoice = new FormControl<unknown>({ value: null, disabled: true }, Validators.required);
  private pickedArea: KnownArea | null = null;
  private areaByKey = new Map<string, KnownArea>();
  /** Known areas are added only once the city's real districts are in, to avoid duplicates. */
  private districtsLoaded = false;

  private langSub?: Subscription;
  private requests: Partial<Record<'governorates' | 'cities' | 'districts', Subscription>> = {};

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
    private loadings: LoadingService,
    private translate: TranslateService,
    /** Applies the saved language and page direction when /auth/register is opened directly. */
    private languageService: LanguageService
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
    this.langSub = this.translate.onLangChange.subscribe(() => this.rebuildOptions());
  }

  ngOnDestroy() {
    this.langSub?.unsubscribe();
    this.cancelRequests('governorates', 'cities', 'districts');
  }

  private rebuildOptions(): void {
    const toOptions = (list: any[], kind: 'country' | 'governorate' | 'city' | 'district') =>
      list.map((item) => ({ value: item.id, label: this.locName(item, kind) }));
    this.countryOptions = toOptions(this.countries, 'country');
    this.governorateOptions = toOptions(this.governorates, 'governorate');
    this.cityOptions = toOptions(this.cities, 'city');
    this.districtOptions = [...toOptions(this.districts, 'district'), ...this.knownAreaOptions()];
  }

  /** Well-known areas of the chosen city that the dashboard does not list as districts yet. */
  private knownAreaOptions(): BhSelectOption[] {
    this.areaByKey.clear();
    const cityId = Number(this.addressFG?.get('cityId')?.value);
    if (!this.districtsLoaded || !cityId) return [];

    const existing = new Set(
      this.districts.flatMap((d) => [normalizeName(d.district_name_ar), normalizeName(d.district_name).toLowerCase()])
    );
    const isAr = document.documentElement.dir === 'rtl';
    return (KNOWN_AREAS[cityId] ?? [])
      .filter((a) => !existing.has(normalizeName(a.name_ar)) && !existing.has(normalizeName(a.name).toLowerCase()))
      .map((a) => {
        const key = AREA_PREFIX + a.name;
        this.areaByKey.set(key, a);
        return { value: key, label: isAr ? a.name_ar : a.name };
      });
  }

  /** District list -> form: real ids go straight to districtId; an area rides on the city's first district. */
  private applyDistrictChoice(choice: unknown): void {
    const area = typeof choice === 'string' ? this.areaByKey.get(choice) ?? null : null;
    this.pickedArea = area;
    const id = typeof choice === 'number' ? choice : area ? this.districts[0]?.id ?? null : null;
    this.addressFG.get('districtId')!.setValue(id, { emitEvent: false });
  }

  /** A city without dashboard districts cannot send a districtId, so it stops being required there. */
  private syncDistrictRules(): void {
    const districtId = this.addressFG.get('districtId')!;
    districtId.setValidators(this.districts.length ? [Validators.required] : []);
    districtId.updateValueAndValidity({ emitEvent: false });

    this.districtChoice.setValidators(this.districtOptions.length ? [Validators.required] : []);
    this.districtChoice.updateValueAndValidity({ emitEvent: false });

    if (this.districtOptions.length === 1 && this.districtChoice.enabled && this.districtChoice.value == null) {
      this.districtChoice.setValue(this.districtOptions[0].value);
    }
  }

  // convenience getter
  get addressFG(): FormGroup {
    return this.registerForm.get('address') as FormGroup;
  }

  /** A level with a single choice is picked automatically, so its field is not worth showing. */
  get showCountryField(): boolean {
    if (this.loadingCountries) return false;
    return this.countries.length !== 1 || this.addressFG.get('countryId')!.value == null;
  }

  get showGovernorateField(): boolean {
    if (this.showCountryField) return true;
    if (this.loadingGovernorates) return false;
    return this.governorates.length !== 1 || this.addressFG.get('governorateId')!.value == null;
  }

  /** "Giza, Egypt" for the levels that were picked automatically. */
  get autoRegionLabel(): string {
    const parts: string[] = [];
    if (!this.showGovernorateField && this.governorateOptions[0]) parts.push(this.governorateOptions[0].label);
    if (!this.showCountryField && this.countryOptions[0]) parts.push(this.countryOptions[0].label);
    return parts.join(document.documentElement.dir === 'rtl' ? '، ' : ', ');
  }

  /** Location lists come as { country_name, country_name_ar }, { city_name, city_name_ar }, … */
  locName(item: any, kind: 'country' | 'governorate' | 'city' | 'district'): string {
    const en = item?.[`${kind}_name`] ?? item?.name;
    const ar = item?.[`${kind}_name_ar`] ?? item?.nameAr;
    return document.documentElement.dir === 'rtl' ? ar || en : en || ar;
  }

  /** A list with a single choice (e.g. one country) needs no click. */
  private autoPick(controlName: string, list: any[]): void {
    const control = this.addressFG.get(controlName);
    if (list.length === 1 && control && control.enabled && control.value == null) {
      control.setValue(list[0].id);
    }
  }

  private handleDependentSelects() {
    // The District list follows districtId's enabled state and writes back through applyDistrictChoice.
    const districtId = this.addressFG.get('districtId')!;
    districtId.statusChanges.subscribe(() => {
      if (districtId.disabled) this.districtChoice.disable({ emitEvent: false });
      else this.districtChoice.enable({ emitEvent: false });
    });
    this.districtChoice.valueChanges.subscribe((choice) => this.applyDistrictChoice(choice));

    // Country -> Governorates
    this.addressFG.get('countryId')!.valueChanges.subscribe((countryId) => {
      this.cancelRequests('governorates', 'cities', 'districts');
      this.governorates = [];
      this.cities = [];
      this.districts = [];
      this.rebuildOptions();

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
      this.cancelRequests('cities', 'districts');
      this.cities = [];
      this.districts = [];
      this.rebuildOptions();

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
      this.cancelRequests('districts');
      this.districts = [];
      this.districtsLoaded = false;
      this.pickedArea = null;
      this.districtChoice.reset(null, { emitEvent: false });
      this.rebuildOptions();
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
          this.countries = res?.data ?? res ?? [];
          this.rebuildOptions();
          this.autoPick('countryId', this.countries);
        },
        error: () => {
          this.countries = [];
          this.rebuildOptions();
        }
      });
  }

  /** Drops in-flight lookups, so a slow answer for an earlier choice cannot fill the list. */
  private cancelRequests(...levels: Array<'governorates' | 'cities' | 'districts'>): void {
    for (const level of levels) {
      this.requests[level]?.unsubscribe();
      this.requests[level] = undefined;
    }
    if (levels.includes('governorates')) this.loadingGovernorates = false;
    if (levels.includes('cities')) this.loadingCities = false;
    if (levels.includes('districts')) this.loadingDistricts = false;
  }

  getGovernorates(countryId: number) {
    this.cancelRequests('governorates');
    this.loadingGovernorates = true;
    this.requests.governorates = this.sharedService
      .getGovernoratesByCountryId(countryId)
      .pipe(finalize(() => (this.loadingGovernorates = false)))
      .subscribe({
        next: (res: any) => {
          this.governorates = belongingTo(res?.data ?? res ?? [], 'countryId', countryId);
          this.rebuildOptions();
          this.autoPick('governorateId', this.governorates);
        },
        error: () => {
          this.governorates = [];
          this.rebuildOptions();
        }
      });
  }

  getCities(governorateId: number) {
    this.cancelRequests('cities');
    this.loadingCities = true;
    this.requests.cities = this.sharedService
      .getCitiesByGovernorateId(governorateId)
      .pipe(finalize(() => (this.loadingCities = false)))
      .subscribe({
        next: (res: any) => {
          this.cities = belongingTo(res?.data ?? res ?? [], 'governorateId', governorateId);
          this.rebuildOptions();
          this.autoPick('cityId', this.cities);
        },
        error: () => {
          this.cities = [];
          this.rebuildOptions();
        }
      });
  }

  getDistricts(cityId: number) {
    this.cancelRequests('districts');
    this.loadingDistricts = true;
    this.requests.districts = this.sharedService
      .getDistrictsByCityId(cityId)
      .pipe(finalize(() => (this.loadingDistricts = false)))
      .subscribe({
        next: (res: any) => {
          this.districts = belongingTo(res?.data ?? res ?? [], 'cityId', cityId);
          this.districtsLoaded = true;
          this.rebuildOptions();
          this.syncDistrictRules();
        },
        error: () => {
          this.districts = [];
          this.districtsLoaded = true;
          this.rebuildOptions();
          this.syncDistrictRules();
        }
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

    if (this.registerForm.invalid || this.districtChoice.invalid) {
      this.errorMessage = this.translate.instant('auth.reg.fillAll');
      this.registerForm.markAllAsTouched();
      this.districtChoice.markAsTouched();
      return;
    }

    // ✅ matches backend DTO exactly
    const data = this.registerForm.getRawValue();
    data.address.isDefault = true;
    if (this.pickedArea) {
      // The area is not a dashboard district yet, so it travels in the address text.
      data.address.landmark = [this.pickedArea.name_ar, data.address.landmark].filter(Boolean).join(' - ');
    }

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
            this.errorMessage = all?.[0] || this.translate.instant('auth.reg.failed');
            return;
          }
          this.errorMessage =
            err?.error?.message_ar || err?.error?.message || this.translate.instant('auth.reg.failed');
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
