import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import {
  EGYPT_CITIES,
  EGYPT_DISTRICTS,
  EGYPT_GOVERNORATES,
  labelOf,
  mergeById,
} from 'src/app/utils/egypt-locations';

export interface Address {
  id: number;
  countryName: string;
  governorateName: string;
  cityName: string;
  districtName: string;
  street: string;
  buildingNumber: string;
  floor: string;
  apartment: string;
  landmark: string;
  isDefault: boolean;
}
export interface UserDetails {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  address: Address[];
}

type SelectKey = 'country' | 'governorate' | 'city' | 'district' | null;

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  userId = '';
  user!: UserDetails;
  loading = true;
  countries: any[] = [];
  governorates: any[] = [];
  cities: any[] = [];
  districts: any[] = [];

  editing = false;
  showAddAddress = false;
  openSelect: SelectKey = null;
  actionLoading = false;

  profileForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    phoneNumber: new FormControl<string | null>(null),
  });

  addressForm = new FormGroup({
    countryId: new FormControl(0, { nonNullable: true, validators: [Validators.min(1)] }),
    governorateId: new FormControl(0, { nonNullable: true, validators: [Validators.min(1)] }),
    cityId: new FormControl(0, { nonNullable: true, validators: [Validators.min(1)] }),
    districtId: new FormControl(0, { nonNullable: true, validators: [Validators.min(1)] }),
    street: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    buildingNumber: new FormControl('', { nonNullable: true }),
    floor: new FormControl('', { nonNullable: true }),
    apartment: new FormControl('', { nonNullable: true }),
    landmark: new FormControl('', { nonNullable: true }),
    isDefault: new FormControl(false, { nonNullable: true }),
  });

  constructor(
    private accountService: ApiService,
    private addrService: ApiService,
    private router: Router
  ) {}

  get isAr(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  initials(name: string | null | undefined): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'BH';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  ngOnInit(): void {
    this.loadCountries();
    this.setupCascading();
    this.resolveUserAndLoad();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('profile-modal-open');
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.openSelect = null;
  }

  toggleSelect(key: SelectKey, event: Event): void {
    event.stopPropagation();
    this.openSelect = this.openSelect === key ? null : key;
  }

  locLabel(item: any): string {
    return labelOf(item || {}, this.isAr);
  }

  selectedLabel(
    list: any[],
    id: number,
    nameKey: string,
    nameArKey: string,
    placeholder: string
  ): string {
    if (!id) return placeholder;
    const hit = list.find((x) => Number(x.id) === Number(id));
    if (!hit) return placeholder;
    return this.isAr ? hit[nameArKey] || hit[nameKey] || hit.nameAr || hit.name : hit[nameKey] || hit.name || hit[nameArKey] || hit.nameAr;
  }

  pickCountry(id: number, event: Event): void {
    event.stopPropagation();
    this.addressForm.patchValue({ countryId: id });
    this.openSelect = null;
  }

  pickGovernorate(id: number, event: Event): void {
    event.stopPropagation();
    this.addressForm.patchValue({ governorateId: id });
    this.openSelect = null;
  }

  pickCity(id: number, event: Event): void {
    event.stopPropagation();
    this.addressForm.patchValue({ cityId: id });
    this.openSelect = null;
  }

  pickDistrict(id: number, event: Event): void {
    event.stopPropagation();
    this.addressForm.patchValue({ districtId: id });
    this.openSelect = null;
  }

  loadCountries() {
    this.addrService.getAllCountries().subscribe({
      next: (res) => {
        this.countries = Array.isArray(res) ? res : [];
        if (!this.countries.length) {
          this.countries = [{ id: 1, country_name: 'Egypt', country_name_ar: 'مصر' }];
        }
      },
      error: () => {
        this.countries = [{ id: 1, country_name: 'Egypt', country_name_ar: 'مصر' }];
      },
    });
  }

  resolveUserAndLoad() {
    this.loading = true;
    this.accountService.GetUserId().subscribe({
      next: (res) => {
        const id = typeof res === 'string' ? res : res?.userId;
        if (!id) {
          this.loading = false;
          this.router.navigate(['/home']);
          return;
        }
        this.userId = id;
        this.load();
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/home']);
      },
    });
  }

  setupCascading() {
    this.addressForm.get('countryId')!.valueChanges.subscribe((countryId) => {
      this.addressForm.patchValue(
        { governorateId: 0, cityId: 0, districtId: 0 },
        { emitEvent: false }
      );
      this.governorates = [];
      this.cities = [];
      this.districts = [];
      if (!countryId) return;
      this.loadGovernorates(countryId);
    });

    this.addressForm.get('governorateId')!.valueChanges.subscribe((governorateId) => {
      this.addressForm.patchValue({ cityId: 0, districtId: 0 }, { emitEvent: false });
      this.cities = [];
      this.districts = [];
      if (!governorateId) return;
      this.loadCities(governorateId);
    });

    this.addressForm.get('cityId')!.valueChanges.subscribe((cityId) => {
      this.addressForm.patchValue({ districtId: 0 }, { emitEvent: false });
      this.districts = [];
      if (!cityId) return;
      this.loadDistricts(cityId);
    });
  }

  private loadGovernorates(countryId: number) {
    const fallback = EGYPT_GOVERNORATES.map((g) => ({
      id: g.id,
      governorate_name: g.name,
      governorate_name_ar: g.nameAr,
      countryId,
    }));

    if (countryId !== 1) {
      this.governorates = this.sortLocs(fallback, 'governorate_name', 'governorate_name_ar');
      return;
    }

    this.addrService.getGovernoratesByCountryId(countryId).subscribe({
      next: (res) => {
        const api = (Array.isArray(res) ? res : []).map((g: any) => ({
          ...g,
          governorate_name: g.governorate_name || g.name,
          governorate_name_ar: g.governorate_name_ar || g.nameAr,
        }));
        this.governorates = this.sortLocs(mergeById(api, fallback), 'governorate_name', 'governorate_name_ar');
      },
      error: () => {
        this.governorates = this.sortLocs(fallback, 'governorate_name', 'governorate_name_ar');
      },
    });
  }

  private sortLocs(list: any[], nameKey: string, nameArKey: string): any[] {
    return [...list].sort((a, b) => {
      const an = (this.isAr ? a[nameArKey] || a[nameKey] : a[nameKey] || a[nameArKey] || '') as string;
      const bn = (this.isAr ? b[nameArKey] || b[nameKey] : b[nameKey] || b[nameArKey] || '') as string;
      return an.localeCompare(bn, this.isAr ? 'ar' : 'en');
    });
  }

  private loadCities(governorateId: number) {
    const fallback = EGYPT_CITIES.filter((c) => c.governorateId === governorateId).map((c) => ({
      id: c.id,
      city_name: c.name,
      city_name_ar: c.nameAr,
      governorateId,
    }));

    this.addrService.getCitiesByGovernorateId(governorateId).subscribe({
      next: (res) => {
        const api = (Array.isArray(res) ? res : []).map((c: any) => ({
          ...c,
          city_name: c.city_name || c.name,
          city_name_ar: c.city_name_ar || c.nameAr,
        }));
        this.cities = mergeById(api, fallback);
        if (!this.cities.length) this.cities = fallback;
      },
      error: () => {
        this.cities = fallback;
      },
    });
  }

  private loadDistricts(cityId: number) {
    const fallback = EGYPT_DISTRICTS.filter((d) => d.cityId === cityId).map((d) => ({
      id: d.id,
      district_name: d.name,
      district_name_ar: d.nameAr,
      cityId,
    }));

    this.addrService.getDistrictsByCityId(cityId).subscribe({
      next: (res) => {
        const api = (Array.isArray(res) ? res : []).map((d: any) => ({
          ...d,
          district_name: d.district_name || d.name,
          district_name_ar: d.district_name_ar || d.nameAr,
        }));
        this.districts = mergeById(api, fallback);
        if (!this.districts.length) this.districts = fallback;
      },
      error: () => {
        this.districts = fallback;
      },
    });
  }

  load() {
    this.loading = true;
    this.accountService.getUserDetails(this.userId).subscribe({
      next: (res) => {
        this.user = res;
        this.profileForm.patchValue({
          name: res.name,
          email: res.email,
          phoneNumber: res.phoneNumber,
        });
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  toggleEdit() {
    this.editing = !this.editing;
    if (!this.editing) {
      this.profileForm.patchValue({
        name: this.user.name,
        phoneNumber: this.user.phoneNumber,
      });
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) return;

    this.actionLoading = true;
    const payload = {
      fullName: this.profileForm.getRawValue().name,
      phoneNumber: this.profileForm.getRawValue().phoneNumber,
    };

    this.accountService.updateProfile(payload).subscribe({
      next: () => {
        this.actionLoading = false;
        this.editing = false;
        this.load();
      },
      error: () => {
        this.actionLoading = false;
      },
    });
  }

  openAddAddress() {
    this.showAddAddress = true;
    this.openSelect = null;
    document.body.classList.add('profile-modal-open');
    this.addressForm.reset({
      street: '',
      buildingNumber: '',
      floor: '',
      apartment: '',
      landmark: '',
      countryId: 0,
      governorateId: 0,
      cityId: 0,
      districtId: 0,
      isDefault: false,
    });
    // Default Egypt so governorates appear immediately
    this.addressForm.patchValue({ countryId: 1 });
  }

  closeAddAddress() {
    this.showAddAddress = false;
    this.openSelect = null;
    document.body.classList.remove('profile-modal-open');
    this.addressForm.reset({
      street: '',
      buildingNumber: '',
      floor: '',
      apartment: '',
      landmark: '',
      countryId: 0,
      governorateId: 0,
      cityId: 0,
      districtId: 0,
      isDefault: false,
    });
  }

  addAddress() {
    if (this.addressForm.invalid) return;

    this.actionLoading = true;
    const v = this.addressForm.getRawValue();

    const gov = this.governorates.find((g) => g.id === v.governorateId);
    const city = this.cities.find((c) => c.id === v.cityId);
    const district = this.districts.find((d) => d.id === v.districtId);

    // API currently seeds only Giza + a few cities. Map fallback ids to safe FKs
    // while preserving the chosen place names in landmark/street.
    const usesFallback =
      v.governorateId >= 1000 || v.cityId >= 1000 || v.districtId >= 1000;

    const placeBits = [
      this.locLabel(district),
      this.locLabel(city),
      this.locLabel(gov),
    ].filter(Boolean);

    const payload = {
      countryId: 1,
      governorateId: usesFallback ? 1 : v.governorateId,
      cityId: usesFallback ? 1 : v.cityId,
      districtId: usesFallback ? 1 : v.districtId,
      street: v.street ?? '',
      buildingNumber: v.buildingNumber ?? '',
      floor: v.floor ?? '',
      apartment: v.apartment ?? '',
      landmark: [v.landmark, usesFallback ? placeBits.join(' · ') : '']
        .filter(Boolean)
        .join(' | '),
      isDefault: v.isDefault ?? false,
    };

    this.accountService.addAddress(payload).subscribe({
      next: () => {
        this.actionLoading = false;
        this.closeAddAddress();
        this.load();
      },
      error: () => (this.actionLoading = false),
    });
  }

  deleteAddress(addrId: number) {
    this.actionLoading = true;
    this.accountService.deleteAddress(addrId).subscribe({
      next: () => {
        this.actionLoading = false;
        this.load();
      },
      error: () => (this.actionLoading = false),
    });
  }

  setDefault(addrId: number) {
    this.actionLoading = true;
    this.accountService.setDefaultAddress(addrId).subscribe({
      next: () => {
        this.actionLoading = false;
        this.load();
      },
      error: () => {
        this.actionLoading = false;
      },
    });
  }

  enableEdit() {
    this.editing = true;
  }
}
