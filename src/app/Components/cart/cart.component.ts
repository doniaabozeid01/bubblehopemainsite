import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { CartCountService } from 'src/app/services/cart-count.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
})
export class CartComponent {
  trackById = (_: number, x: any) => x.id;

  isRtl = document.documentElement.dir === 'rtl';
  cart: any = null;
  userId: string = '';
  branchId!: any;

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private route: Router,
    public languageService: LanguageService,
    private toastr: ToastrService,
    private seoService: SeoService,
    private branchService: BranchService,
    private translate: TranslateService,
    private cartCountService: CartCountService
  ) {}

  ngOnInit(): void {
    this.isRtl = this.translate.currentLang?.startsWith('ar');
    this.translate.onLangChange.subscribe(
      (e) => (this.isRtl = e.lang.startsWith('ar'))
    );
    this.branchId = localStorage.getItem('br');

    const token = localStorage.getItem('token');
    if (token) {
      this.apiService.GetUserId().subscribe({
        next: (res) => {
          this.userId = typeof res === 'string' ? res : res?.userId;
          if (this.userId) {
            console.log('hi');
            console.log(res);

            const initialBranchId = Number(
              this.branchService.getCurrentBranch()
            );
            if (initialBranchId) {
              this.branchId = initialBranchId;
              this.getCart(this.branchId, this.userId);
            }

            this.branchService.currentBranch$.subscribe((branchId) => {
              if (branchId && branchId !== this.branchId) {
                this.branchId = branchId;
                this.getCart(branchId, this.userId);
              }
            });
          }

          this.seoService.updateTitleAndDescription(
            `Cart | Bubble Hope`,
            `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
          );
        },
        error: (err) => {
          console.error('❌ Error getting userId:', err);
          const initialBranchId = Number(this.branchService.getCurrentBranch());
          if (initialBranchId) {
            this.branchId = initialBranchId;
            this.getCart(this.branchId, this.userId);
          }

          this.branchService.currentBranch$.subscribe((branchId) => {
            if (branchId && branchId !== this.branchId) {
              this.branchId = branchId;
              this.getCart(branchId, this.userId);
            }
          });
        },
      });
    } else {
      this.route.navigate(['/auth/login']);
    }

    // const initialBranchId = Number(this.branchService.getCurrentBranch());
    // if (initialBranchId) {
    //   this.branchId = initialBranchId;
    //   this.getCart();
    // }

    // this.branchService.currentBranch$.subscribe(branchId => {
    //   if (branchId && branchId !== this.branchId) {
    //     this.branchId = branchId;
    //     this.getCart();
    //   }
    // });
  }

  // getCart(branchId: number, userId: string) {
  //   console.log("hello");

  //   this.apiService.GetCartByUserIdAndBranchId(userId, branchId).subscribe({
  //     next: (res) => {
  //       console.log(this.userId);
  //       console.log(this.branchId);

  //       console.log(res);

  //       this.cart = res;

  //       console.log('✅ cart loaded:', this.cart);
  //     },
  //     error: (err) => {
  //       this.cart = null;

  //       console.error('❌ Error fetching cart:', err)
  //     },
  //   });
  // }

  getCart(branchId: number, userId: string) {
    console.log('hello');

    this.apiService.GetCartByUserIdAndBranchId(userId, branchId).subscribe({
      next: (res: any) => {
        this.cart = res;
        console.log('✅ cart loaded:', this.cart);

        // ✅ 1) هاتي الـ items من أي شكل (جرّبت أكتر من احتمال)
        const items =
          res?.cartItems ??
          res?.items ??
          res?.cart?.cartItems ??
          res?.data?.cartItems ??
          [];

        // ✅ 2) احسبي العدد (مجموع الكميات)
        const count = (items || []).reduce(
          (sum: number, it: any) => sum + Number(it?.quantity ?? it?.qty ?? 1),
          0
        );

        // ✅ 3) خزّنيه في السيرفس (هيظهر في الـ Navbar + يفضل بعد reload)
        this.cartCountService.setCount(count);
      },
      error: (err) => {
        this.cart = null;
        this.cartCountService.setCount(0); // ✅
        console.error('❌ Error fetching cart:', err);
      },
    });
  }

  updateQuantity(item: any, quantity: number) {
    if (quantity < 1) return;
    this.apiService.UpdateCartItem(item.id, quantity).subscribe({
      next: () => this.getCart(this.branchId, this.userId),
      error: (err) => {
        this.toastr.error(err.error.message);
        console.error('❌ Error updating quantity:', err);
      },
    });
  }

  // deleteItem(id: number) {
  //   const items = this.cart?.cartItems || [];
  //   const wasLast = items.length === 1;

  //   // نسخة للرجوع لو فشل الطلب
  //   const prevCart = JSON.parse(JSON.stringify(this.cart));

  //   // تحديث تفاؤلي محليًا
  //   const idx = items.findIndex((x: any) => x.id === id || x.cartItemId === id);
  //   if (idx > -1) {
  //     this.cart.cartItems = [...items.slice(0, idx), ...items.slice(idx + 1)];

  //   }

  //   // لو ده كان آخر عنصر، اعتبر الكارت فاضي فورًا
  //   if (wasLast) {
  //     this.cart = { id: 0, cartItems: [] } as any;
  //   }

  //   this.apiService.DeleteCartItem(id).subscribe({
  //     next: () => {
  //       this.toastr.success('Product removed from your cart.');
  //       // (اختياري) لو مش آخر عنصر وعايزة تحدثي الإجماليات من السيرفر:
  //       // if (!wasLast) this.getCart(this.branchId, this.userId);
  //     },
  //     error: (err) => {
  //       // رجّعي الحالة القديمة لو حصل خطأ
  //       this.cart = prevCart;
  //       console.error('❌ Error deleting item:', err);
  //       this.toastr.error('Failed to remove item');
  //     },
  //   });
  // }













  deleteItem(id: number) {
  const items = this.cart?.cartItems || [];
  const wasLast = items.length === 1;

  // نسخة للرجوع لو فشل الطلب
  const prevCart = JSON.parse(JSON.stringify(this.cart));

  // ✅ هات الكمية اللي هتتشال
  const target = items.find((x: any) => x.id === id || x.cartItemId === id);
  const removedQty = Number(target?.quantity ?? target?.qty ?? 1);

  // تحديث تفاؤلي محليًا
  const idx = items.findIndex((x: any) => x.id === id || x.cartItemId === id);
  if (idx > -1) {
    this.cart.cartItems = [...items.slice(0, idx), ...items.slice(idx + 1)];
  }

  // لو ده كان آخر عنصر، اعتبر الكارت فاضي فورًا
  if (wasLast) {
    this.cart = { id: 0, cartItems: [] } as any;
  }

  // ✅ حدّثي العداد فورًا (Optimistic)
  const newCount = (this.cart?.cartItems || []).reduce(
    (sum: number, it: any) => sum + Number(it?.quantity ?? it?.qty ?? 1),
    0
  );
  this.cartCountService.setCount(newCount);

  this.apiService.DeleteCartItem(id).subscribe({
    next: () => {
      this.toastr.success('Product removed from your cart.');

      // ✅ (اختياري) لو عايزة دقة مطلقة: sync من السيرفر
      // this.getCart(this.branchId, this.userId);
    },
    error: (err) => {
      // رجّعي الحالة القديمة لو حصل خطأ
      this.cart = prevCart;

      // ✅ رجّعي العداد للحالة القديمة
      const prevCount = (prevCart?.cartItems || []).reduce(
        (sum: number, it: any) => sum + Number(it?.quantity ?? it?.qty ?? 1),
        0
      );
      this.cartCountService.setCount(prevCount);

      console.error('❌ Error deleting item:', err);
      this.toastr.error('Failed to remove item');
    },
  });
}





  getSubtotal() {
    return (
      this.cart?.cartItems?.reduce(
        (sum: number, i: any) => sum + i.totalPrice,
        0
      ) || 0
    );
  }

  // getTax() {
  //   return this.getSubtotal() * 0.1;
  // }

  // getTotal() {
  //   return this.getSubtotal() + this.getTax();
  // }

  goToProducts() {
    this.route.navigate(['/products']);
  }

  goToCheckout() {
    const now = new Date();
    const hour = now.getHours(); // بيرجع الساعة من 0 لـ 23

    // لو قبل 10 صباحاً أو بعد 12 مساءً
    if (hour < 10 || hour >= 23) {
      this.toastr.warning(
        'عذرًا، الطلبات متاحة فقط في أوقات العمل من 10 صباحًا حتى 12 مساء.'
      );
      return;
    }
    // داخل أوقات العمل
    this.route.navigate(['/checkout']);
  }
}
