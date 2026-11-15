import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { KNOWN_AREAS, KnownArea } from 'src/app/Components/register/known-areas';
import { labelOf } from 'src/app/utils/egypt-locations';

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

/** Synthetic district ids for known areas (same list as register) until dashboard has them. */
const KNOWN_AREA_ID_BASE = 900000;
const normalizeName = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();

function belongingTo(list: any[], parentKey: string, parentId: number): any[] {
  return (Array.isArray(list) ? list : []).filter(
    (item) => item?.[parentKey] == null || Number(item[parentKey]) === Number(parentId)
  );
}

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
  /** API districts only — known areas are merged into `districts` for the menu. */
  private apiDistricts: any[] = [];
  districts: any[] = [];
  private areaById = new Map<number, KnownArea>();

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

  /** Single country (Egypt) is fixed — hide the dropdown like register. */
  get showCountryField(): boolean {
    return this.countries.length > 1;
  }

  /** Single governorate (Giza) is fixed — hide the dropdown like register. */
  get showGovernorateField(): boolean {
    if (this.showCountryField) return true;
    return this.governorates.length > 1;
  }

  /** "Giza, Egypt" chip for the levels picked automatically. */
  get autoRegionLabel(): string {
    const parts: string[] = [];
    if (!this.showGovernorateField && this.governorates[0]) {
      parts.push(this.locLabel(this.governorates[0]));
    }
    if (!this.showCountryField && this.countries[0]) {
      const c = this.countries[0];
      parts.push(
        this.isAr
          ? c.country_name_ar || c.country_name
          : c.country_name || c.country_name_ar
      );
    }
    return parts.join(this.isAr ? '، ' : ', ');
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
        this.autoPick('countryId', this.countries);
      },
      error: () => {
        this.countries = [{ id: 1, country_name: 'Egypt', country_name_ar: 'مصر' }];
        this.autoPick('countryId', this.countries);
      },
    });
  }

  /** A list with a single choice needs no click. */
  private autoPick(controlName: string, list: any[]): void {
    const control = this.addressForm.get(controlName);
    if (!control || list.length !== 1) return;
    const current = Number(control.value) || 0;
    if (current) return;
    control.setValue(list[0].id);
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
      this.apiDistricts = [];
      this.districts = [];
      this.areaById.clear();
      if (!countryId) return;
      this.loadGovernorates(countryId);
    });

    this.addressForm.get('governorateId')!.valueChanges.subscribe((governorateId) => {
      this.addressForm.patchValue({ cityId: 0, districtId: 0 }, { emitEvent: false });
      this.cities = [];
      this.apiDistricts = [];
      this.districts = [];
      this.areaById.clear();
      if (!governorateId) return;
      this.loadCities(governorateId);
    });

    this.addressForm.get('cityId')!.valueChanges.subscribe((cityId) => {
      this.addressForm.patchValue({ districtId: 0 }, { emitEvent: false });
      this.apiDistricts = [];
      this.districts = [];
      this.areaById.clear();
      if (!cityId) return;
      this.loadDistricts(cityId);
    });
  }

  private loadGovernorates(countryId: number) {
    // Delivery is fixed to Giza — keep API list (usually one) so the field hides like register.
    const gizaFallback = [
      {
        id: 1,
        governorate_name: 'Giza',
        governorate_name_ar: 'الجيزة',
        countryId,
      },
    ];

    this.addrService.getGovernoratesByCountryId(countryId).subscribe({
      next: (res) => {
        const api = (Array.isArray(res) ? res : []).map((g: any) => ({
          ...g,
          governorate_name: g.governorate_name || g.name,
          governorate_name_ar: g.governorate_name_ar || g.nameAr,
        }));
        this.governorates = this.sortLocs(
          api.length ? api : gizaFallback,
          'governorate_name',
          'governorate_name_ar'
        );
        this.autoPick('governorateId', this.governorates);
      },
      error: () => {
        this.governorates = gizaFallback;
        this.autoPick('governorateId', this.governorates);
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
    this.addrService.getCitiesByGovernorateId(governorateId).subscribe({
      next: (res) => {
        const raw = Array.isArray(res) ? res : (res as any)?.data ?? [];
        this.cities = belongingTo(raw, 'governorateId', governorateId).map((c: any) => ({
          ...c,
          city_name: c.city_name || c.name,
          city_name_ar: c.city_name_ar || c.nameAr,
        }));
        this.autoPick('cityId', this.cities);
      },
      error: () => {
        this.cities = [];
      },
    });
  }

  private loadDistricts(cityId: number) {
    this.addrService.getDistrictsByCityId(cityId).subscribe({
      next: (res) => {
        const raw = Array.isArray(res) ? res : (res as any)?.data ?? [];
        this.apiDistricts = belongingTo(raw, 'cityId', cityId).map((d: any) => ({
          ...d,
          district_name: d.district_name || d.name,
          district_name_ar: d.district_name_ar || d.nameAr,
        }));
        this.rebuildDistrictMenu(cityId);
      },
      error: () => {
        this.apiDistricts = [];
        this.rebuildDistrictMenu(cityId);
      },
    });
  }

  /** Same district menu as register: API districts + well-known areas not yet in the dashboard. */
  private rebuildDistrictMenu(cityId: number): void {
    this.areaById.clear();
    const existing = new Set(
      this.apiDistricts.flatMap((d) => [
        normalizeName(d.district_name_ar),
        normalizeName(d.district_name).toLowerCase(),
      ])
    );

    const known = (KNOWN_AREAS[cityId] ?? [])
      .filter(
        (a) =>
          !existing.has(normalizeName(a.name_ar)) &&
          !existing.has(normalizeName(a.name).toLowerCase())
      )
      .map((a, i) => {
        const id = KNOWN_AREA_ID_BASE + i;
        this.areaById.set(id, a);
        return {
          id,
          district_name: a.name,
          district_name_ar: a.name_ar,
          cityId,
          _knownArea: true,
        };
      });

    this.districts = [...this.apiDistricts, ...known];
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
    this.apiDistricts = [];
    this.districts = [];
    this.areaById.clear();
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
    this.apiDistricts = [];
    this.districts = [];
    this.areaById.clear();
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
    const knownArea = this.areaById.get(v.districtId) ?? null;

    // Known areas are not dashboard districts yet — ride on the city's first real district
    // and keep the place name in landmark (same as register).
    const districtId = knownArea
      ? this.apiDistricts[0]?.id ?? 1
      : v.districtId;

    const payload = {
      countryId: 1,
      governorateId: v.governorateId,
      cityId: v.cityId,
      districtId,
      street: v.street ?? '',
      buildingNumber: v.buildingNumber ?? '',
      floor: v.floor ?? '',
      apartment: v.apartment ?? '',
      landmark: knownArea
        ? [knownArea.name_ar, v.landmark].filter(Boolean).join(' - ')
        : v.landmark ?? '',
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
