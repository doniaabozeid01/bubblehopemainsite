import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { LanguageService } from 'src/app/services/language.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {

  orderForm!: FormGroup;
  loading = false;
  submitted = false;

  userId!: string;
  cartId!: number;

  cartItems: any[] = [];
  totalamount: number = 0;

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
    private toastr: ToastrService,
    private translate: TranslateService
  ) { }

ngOnInit(): void {
  this.orderForm = this.fb.group({
    addressId: [null, Validators.required],
    paymentMethodId: [null, Validators.required],
    code: [''],
    source: [1]
  });

  this.loadPaymentMethods();

  this.api.GetUserId().subscribe(res => {
    this.userId = res.userId;

    this.loadAddresses();

    this.api.GetUserBranch(this.userId).subscribe(branch => {
      this.getCartId(this.userId, branch.id);
    });
  });
}


  // =============================
  // Cart 
  // =============================
  getCartId(userId: string, branchId: number) {
    this.api.GetCartByUserIdAndBranchId(userId, branchId).subscribe({
      next: (res) => {
        console.log(res);
        this.cartId = res.id;
        this.cartItems = res.cartItems;
        this.totalamount = res.totalAmount;
      },
      error: (err) => {
        console.error('Error loading cart', err);
      }
    }

    );
  }

  // =============================
  // Addresses
  // =============================
  loadAddresses() {
    this.api.GetUserAddresses().subscribe({
      next: (res) => {
        this.addresses = res;
      },
      error: (err) => {
        console.error('Error loading addresses', err);
      }
    });
  }

  goToAddAddress() {
    this.router.navigate(['/profile/addresses'], {
      queryParams: { returnUrl: '/checkout' }
    });
  }

  // =============================
  // Payment
  // =============================
  loadPaymentMethods() {
    this.api.GetAllPaymentMethods().subscribe(res => {
      this.paymentMethods = res;
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
      userId: this.userId,
      addressId: this.orderForm.value.addressId,
      paymentMethodId: this.orderForm.value.paymentMethodId,
      code: this.orderForm.value.code,
      source: 1
    };

    this.api.CreateOrderPaymob(request).subscribe({
      next: (res) => {
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
        console.log(res);
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
        console.log(err);

        this.discountError = err.error?.message || 'Invalid code';
      }
    });
  }

}

