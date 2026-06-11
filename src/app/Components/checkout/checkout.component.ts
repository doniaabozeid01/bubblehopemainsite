import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {

  readonly FulfillmentType = {
    Delivery: 1,
    Pickup: 2,
  } as const;

  orderForm!: FormGroup;
  loading = false;
  submitted = false;

  userId!: string;
  cartId!: number;

  cartItems: any[] = [];
  totalamount: number = 0;
  deliveryFee: number = 0;
  branchId: number | null = null;
  branches: any[] = [];

  addresses: any[] = [];
  paymentMethods: any[] = [];

  discountRatio = 0;
  discountError: string | null = null;
  applydiscount = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    public languageService: LanguageService,
    public branchService: BranchService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) { }

//   ngOnInit(): void {
//     this.orderForm = this.fb.group({
//       addressId: [null, Validators.required],
//       paymentMethodId: [null, Validators.required],
//       code: [''],
//       source: [1]
//     });

//     this.loadPaymentMethods();

//     this.api.GetUserId().subscribe(res => {
//       this.userId = res.userId;

//       this.loadAddresses();

// this.api.GetUserBranch(this.userId).subscribe(branch => {

//   this.getCartId(this.userId, branch.id);
// });
//     });
//   }


  // =============================
  // Cart
  // =============================

  ngOnInit(): void {
    this.orderForm = this.fb.group({
      fulfillmentType: [this.FulfillmentType.Delivery, Validators.required],
      addressId: [null, Validators.required],
      paymentMethodId: [null, Validators.required],
      code: [''],
      source: [1],
    });

    this.orderForm
      .get('fulfillmentType')
      ?.valueChanges.subscribe((type) => this.onFulfillmentTypeChange(type));

    this.loadPaymentMethods();
    this.loadBranches();

    this.api.GetUserId().subscribe(res => {
      this.userId = res.userId;
      this.loadAddresses();


      const currentBranchId = this.branchService.getCurrentBranch();

      if (currentBranchId) {
        this.branchId = Number(currentBranchId);
        this.setDeliveryFeeByBranch(this.branchId);
        this.getCartId(this.userId, currentBranchId);
      } else {

        this.api.GetUserBranch(this.userId).subscribe(branch => {
          this.branchId = Number(branch.id);
          this.setDeliveryFeeByBranch(this.branchId);
          this.getCartId(this.userId, branch.id);
        });
      }

      this.branchService.currentBranch$.subscribe((newBranchId) => {
        if (!newBranchId || !this.userId) return;
        if (newBranchId === this.branchId) return;

        this.branchId = newBranchId;
        this.setDeliveryFeeByBranch(newBranchId);
        this.getCartId(this.userId, newBranchId);
      });
    });
}

  loadBranches() {
    this.api.getAllBranches().subscribe({
      next: (res: any[]) => {
        this.branches = res || [];
        this.setDeliveryFeeByBranch(this.branchId);
      },
      error: () => {
        this.deliveryFee = 0;
      }
    });
  }

  setDeliveryFeeByBranch(branchId: number | null) {
    const numericBranchId = Number(branchId);
    if (!numericBranchId || !this.branches?.length) {
      this.deliveryFee = 0;
      return;
    }

    const currentBranch = this.branches.find((b: any) => b.id === numericBranchId);
    this.deliveryFee = Number(currentBranch?.deliveryFee ?? 0);
  }




  getCartId(userId: string, branchId: number) {
    this.api.GetCartByUserIdAndBranchId(userId, branchId).subscribe({
      next: (res) => {
        // console.log(res);
        this.cartId = res.id;
        this.cartItems = res.cartItems;
        this.totalamount = res.totalAmount;
      },
      error: (err) => {
        console.error('Error loading cart', err);
      }
    });
  }

  get isSelfPickup(): boolean {
    return (
      Number(this.orderForm?.get('fulfillmentType')?.value) ===
      this.FulfillmentType.Pickup
    );
  }

  get pickupBranchName(): string {
    const branch = this.branches.find((b: any) => b.id === Number(this.branchId));
    if (!branch) return '';
    return this.translate.currentLang === 'ar'
      ? branch.name_ar ?? branch.name
      : branch.name ?? branch.name_ar;
  }

  get effectiveDeliveryFee(): number {
    return this.isSelfPickup ? 0 : this.deliveryFee;
  }

  onFulfillmentTypeChange(type: number): void {
    const addressCtrl = this.orderForm.get('addressId');
    if (!addressCtrl) return;

    if (Number(type) === this.FulfillmentType.Pickup) {
      addressCtrl.clearValidators();
      addressCtrl.setValue(null);
    } else {
      addressCtrl.setValidators(Validators.required);
      const defaultAddress =
        this.addresses.find((a) => a.isDefault)?.id ??
        this.addresses[0]?.id ??
        null;
      addressCtrl.setValue(defaultAddress);
    }

    addressCtrl.updateValueAndValidity();
  }

  getFinalTotal() {
    return this.totalamount + this.effectiveDeliveryFee;
  }

  // =============================
  // Addresses
  // =============================
  loadAddresses() {
    this.api.GetUserAddresses().subscribe({
      next: (res) => {
        this.addresses = res;
        if (!this.isSelfPickup) {
          this.orderForm.patchValue({
            addressId: this.addresses.find((a) => a.isDefault)?.id || null,
          });
        }
      },
      error: (err) => {
        console.error('Error loading addresses', err);
      },
    });
  }

  goToAddAddress() {
    this.router.navigate(['/profile'], {
      queryParams: { returnUrl: '/checkout' }
    });
  }

  // =============================
  // Payment
  // =============================
  loadPaymentMethods() {
    this.api.GetAllPaymentMethods().subscribe(res => {
      this.paymentMethods = res;
      this.orderForm.patchValue({
        paymentMethodId: this.paymentMethods.length > 0 ? this.paymentMethods[0].id : null
      });
    });
  }

  // =============================
  // Submit Order
  // =============================
  submitOrder(): void {
    this.submitted = true;

    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    if (!this.cartItems || this.cartItems.length === 0) {
      const msg = this.translate.currentLang === 'ar'
        ? 'سلة المشتريات فارغة'
        : 'Your cart is empty';
      this.toastr.warning(msg);
      return;
    }

    this.loading = true;

    const request = {
      addressId: this.isSelfPickup ? null : this.orderForm.value.addressId,
      paymentMethodId: this.orderForm.value.paymentMethodId,
      code: this.orderForm.value.code,
      source: 1,
      fulfillmentType: this.orderForm.value.fulfillmentType,
    };
    // console.log(request);
    

    this.api.CreateOrderPaymob(request).subscribe({
      next: (res) => {
        // console.log(res);
        
        this.loading = false;

        if (res?.checkoutUrl) {
          window.location.href = res.checkoutUrl;
          return;
        }

        const successMsg = this.translate.currentLang === 'ar'
          ? 'تم تسجيل الطلب بنجاح'
          : 'Order placed successfully';

        this.toastr.success(successMsg);
        this.router.navigate(['/allorders']);
      },
      error: (err) => {
        this.loading = false;
        // console.log(err);
        
        this.toastr.error(
          err.error?.message || 'Something went wrong'
        );
      }
    });
  }

  // =============================
  // Discount
  // =============================
  checkDiscountCode() {
    const code = this.orderForm.get('code')?.value;
    if (!code) return;

    this.api.checkDiscountValidation({
      code,
      userId: this.userId
    }).subscribe({
      next: (res) => {
        // console.log(res);
        if (res?.success && !this.applydiscount) {
          this.discountRatio = res.discountValue;
          this.totalamount -= this.totalamount * (this.discountRatio / 100);
          this.applydiscount = true;
          this.toastr.success(
            this.translate.currentLang === 'ar'
              ? 'تم تطبيق الخصم'
              : 'Discount applied'
          );
        } else {
          this.discountError = res?.message || 'Invalid code';
        }
      },
      error: (err) => {
        // console.log(err);

        this.discountError = err.error?.message || 'Invalid code';
      }
    });
  }
}
