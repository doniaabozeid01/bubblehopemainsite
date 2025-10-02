import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent {
  loading = false;
  orderForm!: FormGroup;
  userId!: string;
  cartItems: any;
  cartId!: number;
  totalamount!: number;
  countries: any;
  governorates: any;
  cities: any;
  districts: any;
  paymentMethods: any;
  discountRatio!: number;
  discountError: any;
  submitted = false;
  optional = false;
  CheckCartItems: boolean = false;
  applydiscount: boolean = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    public languageService: LanguageService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.orderForm = this.fb.group({
      fullName: ['', Validators.required],
      phone: ['', Validators.required],
      countryId: [null, Validators.required],
      governorateId: [null, Validators.required],
      cityId: [null, Validators.required],
      districtId: [null, Validators.required],
      street: [''],
      buildingNumber: [''],
      floor: [''],
      apartment: [''],
      landmark: [''],
      paymentMethodId: [null, Validators.required],
      code: [''],
      source: [''],
    });

    this.loadCountries();
    this.loadpaymentMethods();

    this.orderForm.get('countryId')?.valueChanges.subscribe(countryId => {
      if (countryId) {
        this.api.getGovernoratesByCountryId(countryId).subscribe(governorates => {
          this.governorates = governorates;
          this.cities = [];
          this.districts = [];
          this.orderForm.patchValue({
            governorateId: null,
            cityId: null,
            districtId: null
          });
        });
      }
    });

    this.orderForm.get('governorateId')?.valueChanges.subscribe(govId => {
      if (govId) {
        this.api.getCitiesByGovernorateId(govId).subscribe(cities => {
          this.cities = cities;
          this.districts = [];
          this.orderForm.patchValue({
            cityId: null,
            districtId: null
          });
        });
      }
    });

    this.orderForm.get('cityId')?.valueChanges.subscribe(cityId => {
      if (cityId) {
        this.api.getDistrictsByCityId(cityId).subscribe(districts => {
          this.districts = districts;
          this.orderForm.patchValue({
            districtId: null
          });
        });
      }
    });

    this.api.GetUserId().subscribe({
      next: (res) => {
        this.userId = res.userId;
        this.api.GetUserBranch(this.userId).subscribe({
          next: (response) => {
            console.log(response);
            this.getCartId(this.userId, response.id);

          }
        })
      }
    });
  }

  getCartId(userId: string, branchId: number) {
    this.api.GetCartByUserIdAndBranchId(userId, branchId).subscribe({
      next: (response) => {
        this.cartId = response.id;
        this.totalamount = response.totalAmount;
        this.cartItems = response.cartItems;
      }
    });
  }

  loadCountries() {
    this.api.getAllCountries().subscribe({
      next: (res) => {
        this.countries = res;
      }
    });
  }

  loadpaymentMethods() {
    this.api.GetAllPaymentMethods().subscribe({
      next: (res) => {
        this.paymentMethods = res;
      }
    });
  }

  submitOrder(): void {
    this.loading = true;
    this.submitted = true;
    this.optional = true;
    console.log(this.orderForm);

    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      this.loading = false;
      return;
    }

    if (!this.cartItems || this.cartItems.length === 0) {
      const emptyCartMsg = this.translate.currentLang === 'ar'
        ? 'سلة المشتريات فارغة، أضف منتجات قبل إتمام الطلب.'
        : 'Your cart is empty. Please add items before placing the order.';
      this.toastr.warning(emptyCartMsg, '', { timeOut: 3000 });
      this.loading = false;
      return;
    }

    const request = { userId: this.userId, ...this.orderForm.value };
    request.source = 1;
    this.api.CreateOrderPaymob(request).subscribe({
      next: (res) => {
        console.log(res);

        this.loading = false;

        // ✅ لو في checkoutUrl → ده دفع أونلاين عبر Paymob
        if (res?.checkoutUrl) {
          // افتح في نفس الصفحة (مفضل)
          window.location.href = res.checkoutUrl;
          // localStorage.setItem('last_order_id', res.orderId);
          console.log(this.cartItems);

          // localStorage.setItem('cart_backup', JSON.stringify(this.cartItems));

          // أو نافذة جديدة (قد تُمنع كبوب-أب):
          // window.open(res.checkoutUrl, '_blank');
          return;
        }

        // ✅ COD (بدون تحويل)
        const currentLang = this.translate.currentLang || 'en';
        const successMessage = currentLang === 'ar'
          ? (res?.messageAr || 'تم تسجيل الطلب بنجاح')
          : (res?.message || 'Order placed successfully');

        this.toastr.success(successMessage, '', { timeOut: 3000 });
        this.router.navigate(['/allorders']);
      },
      error: (err) => {
        console.log(err);

        this.loading = false;
        const currentLang = this.translate.currentLang || 'en';
        const errorMessage = currentLang === 'ar'
          ? (err.error?.messageAr || 'حدث خطأ أثناء تنفيذ الطلب')
          : (err.error?.message || 'Something went wrong while placing the order');
        this.toastr.error(errorMessage, '', { timeOut: 3000 });
      }
    });
  }



  GetCartItemByCartId(cartId: number) {
    this.api.GetCartItemByCartId(cartId).subscribe({
      next: (response) => {
        this.cartItems = response;
      }
    });
  }

  // checkDiscountCode() {
  //   const codeControl = this.orderForm.get('code');


  //   const body = {
  //     code: codeControl?.value,
  //     userId: this.userId
  //   };

  //   if (!codeControl || !codeControl.value) {
  //     console.warn('No discount code entered');
  //     return;
  //   }

  //   this.api.checkDiscountValidation(codeControl.value).subscribe({
  //     next: (response) => {
  //       console.log(response);
  //       if (response != null) {
  //         this.discountRatio = response.discountValue;
  //         this.discountError = "";
  //         this.totalamount = this.totalamount - (this.totalamount * (this.discountRatio / 100));

  //       }
  //       else {
  //         this.discountError = "Invalid Code"
  //       }
  //     },
  //     error: (err) => {
  //       console.log(err);
  //       this.discountError = ""

  //     }
  //   });
  // }




















       checkDiscountCode() {
    const codeControl = this.orderForm.get('code');

    if (!codeControl || !codeControl.value) {
      console.warn('No discount code entered');
      return;
    }

    const body = {
      code: codeControl.value,
      userId: this.userId
    };

    console.log(body);

    const discountMsg = this.translate.currentLang === 'ar'
      ? 'تهانينا! لقد فزت بالخصم بنجاح.'
      : 'Congratulations! You’ve won the discount!';


    this.api.checkDiscountValidation(body).subscribe({
      next: (response) => {
        console.log(response);
        console.log(response);
        
        if (response != null && response.success) {
          this.discountRatio = response.discountValue;
          this.discountError = "";

          if (!this.applydiscount) {
            this.toastr.success(discountMsg)
            this.totalamount = this.totalamount - (this.totalamount * (this.discountRatio / 100));
          }

          this.applydiscount = true;
        } else {
          this.discountError = response?.message ?? "Invalid Code";
        }
      },
      error: (err) => {
        console.log(err);
        this.discountError = err.error.message;
      }
    });
  }














  get isOnline(): boolean {
    const id = this.orderForm.get('paymentMethodId')?.value;
    const m = this.paymentMethods?.find((x: any) => x.id === id);
    const name = (m?.name || '').toString().toLowerCase();
    return name.includes('card') || name.includes('online');
  }



}

interface CreateOrderResponse {
  success: boolean;
  orderId: number;
  checkoutUrl?: string;   // لو موجود → دفع أونلاين
  message?: string;
  messageAr?: string;
}