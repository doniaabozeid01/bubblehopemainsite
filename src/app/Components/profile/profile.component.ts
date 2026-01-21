import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';

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
@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  
  userId = 'ab8107af-9f83-4445-b16c-e75e48e6f7bb';
  user!: UserDetails;
  loading = true;
  countries: any[] = [];
  governorates: any[] = [];
  cities: any[] = [];
  districts: any[] = [];
  // edit mode
  editing = false;
  profileForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl({ value: '', disabled: true }, { nonNullable: true }), // ✅ read-only
    phoneNumber: new FormControl<string | null>(null),
  });

  showAddAddress = false;

  constructor(private accountService: ApiService, private addrService: ApiService) { }

  loadCountries() {
    this.addrService.getAllCountries().subscribe({
      next: (res) => {
        console.log(res);

        this.countries = res;
      },
      error: (err) => {
        console.error('Error loading countries', err);
      }
    });
  }

  addressForm = new FormGroup({
    countryId: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    governorateId: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    cityId: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    districtId: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),

    street: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    buildingNumber: new FormControl('', { nonNullable: true }),
    floor: new FormControl('', { nonNullable: true }),
    apartment: new FormControl('', { nonNullable: true }),
    landmark: new FormControl('', { nonNullable: true }),

    isDefault: new FormControl(false, { nonNullable: true }),
  });

  actionLoading = false;

  ngOnInit(): void {
    this.loadCountries();
    this.setupCascading();
    this.load();
  }

  setupCascading() {
    // Country -> Governorates
    this.addressForm.get('countryId')!.valueChanges.subscribe(countryId => {
      // reset downstream
      this.addressForm.patchValue(
        { governorateId: 0, cityId: 0, districtId: 0 },
        { emitEvent: false }
      );


      this.governorates = [];
      this.cities = [];
      this.districts = [];

      if (!countryId) return;

      this.addrService.getGovernoratesByCountryId(countryId).subscribe(res => {
        this.governorates = res;
      });
    });

    // Governorate -> Cities
    this.addressForm.get('governorateId')!.valueChanges.subscribe(governorateId => {
      this.addressForm.patchValue(
        { cityId: 0, districtId: 0 },
        { emitEvent: false }
      );

      this.cities = [];
      this.districts = [];

      if (!governorateId) return;

      this.addrService.getCitiesByGovernorateId(governorateId).subscribe(res => {
        this.cities = res;
      });
    });

    // City -> Districts
    this.addressForm.get('cityId')!.valueChanges.subscribe(cityId => {
      this.addressForm.patchValue(
        { districtId: 0 },
        { emitEvent: false }
      );

      this.districts = [];

      if (!cityId) return;

      this.addrService.getDistrictsByCityId(cityId).subscribe(res => {
        this.districts = res;
      });
    });
  }

  load() {
    this.loading = true;
    this.accountService.getUserDetails(this.userId).subscribe({
      next: (res) => {
        this.user = res;
        console.log("load : ", res);

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
      // رجّعي القيم الأصلية
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

    console.log(this.profileForm.getRawValue());


    this.accountService.updateProfile(payload).subscribe({
      next: (res) => {
        console.log(res);
        this.actionLoading = false;
        this.editing = false;
        this.load();
      },
      error: (err) => {
        console.log(err);
        this.actionLoading = false;
      },
    });
  }

  openAddAddress() {
    this.showAddAddress = true;
  }

  closeAddAddress() {
    this.showAddAddress = false;
    this.addressForm.reset({
      street: '',
      buildingNumber: '',
      floor: '',
      apartment: '',
      landmark: '',
      countryId: 1,
      governorateId: 1,
      cityId: 1,
      districtId: 1,
    });
  }

  addAddress() {
    if (this.addressForm.invalid) return;

    this.actionLoading = true;

    const v = this.addressForm.getRawValue();

    const payload = {
      countryId: v.countryId ?? 0,
      governorateId: v.governorateId ?? 0,
      cityId: v.cityId ?? 0,
      districtId: v.districtId ?? 0,
      street: v.street ?? '',
      buildingNumber: v.buildingNumber ?? '',
      floor: v.floor ?? '',
      apartment: v.apartment ?? '',
      landmark: v.landmark ?? '',
      isDefault: v.isDefault ?? false,
    };

    this.accountService.addAddress(payload).subscribe({
      next: (res) => {
        console.log("payload : ",payload);
        
        this.actionLoading = false;
        this.closeAddAddress();
        this.load();
        console.log("res : ", res);
        
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
      next: (res) => {
        console.log(res);

        this.actionLoading = false;
        this.load();
      },
      error: (err) => {
        console.log(err);

        this.actionLoading = false
      },
    });
  }

  enableEdit() {
    this.editing = true;
  }

}