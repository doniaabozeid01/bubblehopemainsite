import { Component, DoCheck, ViewChild, ViewChildren } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { CartCountService } from 'src/app/services/cart-count.service';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss'],
})
export class ProductDetailsComponent implements DoCheck {
  product: any = null;
  cartId!: number;
  usreId!: string;
  branchId!: any;
  loading = true;
  productNotFound = false;
  quantity = 1;
  priceAnimActive = false;
  private lastShownTotal = -1;
  private priceAnimReady = false;

  constructor(
    private cartCountService: CartCountService,
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private branchService: BranchService,
    private toastr: ToastrService,
    private seoService: SeoService,
    private translate: TranslateService,
    public languageService: LanguageService
  ) {}

  get isAr(): boolean {
    return this.translate.currentLang === 'ar';
  }

  productName(p: any): string {
    return this.isAr ? p?.name_ar ?? p?.name : p?.name ?? p?.name_ar;
  }

  categoryName(p: any): string {
    return this.isAr
      ? p?.category?.name_ar ?? p?.category?.name
      : p?.category?.name ?? p?.category?.name_ar;
  }

  productDescription(p: any): string {
    return this.isAr
      ? p?.ingredients_ar ?? p?.ingredients
      : p?.ingredients ?? p?.ingredients_ar;
  }

  currencyLabel(p: any): string {
    return this.isAr ? p?.currency_ar ?? p?.currency : p?.currency ?? p?.currency_ar;
  }

  productImage(p: any): string {
    return p?.images?.length ? p.images[0] : 'assets/placeholder.png';
  }

  groupName(group: any): string {
    return this.isAr ? group?.nameAr ?? group?.name : group?.name ?? group?.nameAr;
  }

  optionName(option: any): string {
    return this.isAr ? option?.nameAr ?? option?.name : option?.name ?? option?.nameAr;
  }

  variantName(size: any): string {
    return this.isAr ? size?.nameAr ?? size?.name : size?.name ?? size?.nameAr;
  }

  isMultiGroup(group: any): boolean {
    return group?.selectionType === 1;
  }

  goBack(): void {
    this.location.back();
  }

  shareProduct(): void {
    const url = window.location.href;
    const title = this.product ? this.productName(this.product) : 'Bubble Hope';

    if (navigator.share) {
      navigator.share({ title, url }).catch(() => undefined);
      return;
    }

    navigator.clipboard?.writeText(url).then(() => {
      this.toastr.success('Link copied to clipboard');
    });
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) this.quantity--;
  }

  increaseQuantity(): void {
    if (this.quantity < 99) this.quantity++;
  }

  ngDoCheck(): void {
    if (!this.product || this.loading) return;
    this.syncTotalPriceAnimation();
  }

  private syncTotalPriceAnimation(): void {
    const next = this.totalPrice;
    if (!this.priceAnimReady) {
      this.lastShownTotal = next;
      this.priceAnimReady = true;
      return;
    }
    if (next === this.lastShownTotal) return;

    this.lastShownTotal = next;
    this.priceAnimActive = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.priceAnimActive = true;
      });
    });
  }

  onPriceAnimationEnd(): void {
    this.priceAnimActive = false;
  }

  get totalPrice(): number {
    return this.unitPrice * this.quantity;
  }

  get unitPrice(): number {
    return this.finalPrice;
  }

  ngOnInit() {
    const name = decodeURIComponent(
      this.route.snapshot.paramMap.get('name') ?? ''
    );
    const token = localStorage.getItem('token');

    // if (!token) {
    //   this.router.navigate(['/auth/login'], {
    //     queryParams: { returnUrl: this.router.url }
    //   });
    //   return;
    // }
    if (token) {
      this.api.GetUserId().subscribe({
        next: (r) => {
          // console.log(r);

          this.usreId = r.userId;
          // console.log(this.usreId);
        },
        error: (err) => {
          // console.log(err);
        },
      });
    }

    this.branchService.currentBranch$.subscribe((bid) => {
      // احفظ قيمة الـ stream الأول
      this.branchId = bid;

      // fallback من localStorage لو الـ stream رجّع null
      if (this.branchId == null) {
        const br = Number(localStorage.getItem('br'));
        this.branchId = Number.isFinite(br) ? br : null;
      }

      if (!name || !this.branchId) {
        this.loading = false;
        if (name && !this.branchId) {
          this.productNotFound = true;
        }
        return;
      }

      // if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
      //   this.api.GetUserId().subscribe({
      //     next: (r) => {
      //       this.usreId = r.userId;
      //       // this.api.GetOrCreateCart(this.usreId).subscribe({
      //       //   next: (res) => this.cartId = res.id
      //       // });
      //       this.loadProduct(name);
      //     }
      //   });
      // }
      // else {
      this.loadProduct(name);
      // }
    });
  }

  loadProduct(name: string) {
    if (!name?.trim() || !this.branchId) return;

    this.loading = true;
    this.productNotFound = false;
    this.priceAnimReady = false;
    this.priceAnimActive = false;

    this.api.GetProductByName(name, this.branchId).subscribe({
      next: (response) => {
        if (!response) {
          this.product = null;
          this.productNotFound = true;
          this.loading = false;
          return;
        }

        this.product = response;
        this.quantity = 1;
        this.selectedByGroup.clear();
        this.missingRequired.clear();
        this.isSizeMissing = false;
        this.initVariantDefault(this.product);
        this.initGroupDefaults();
        this.lastShownTotal = this.totalPrice;
        this.priceAnimReady = true;
        this.priceAnimActive = false;

        this.seoService.updateTitleAndDescription(
          `${this.product?.name ?? name} | Bubble Hope`,
          `جرب مشروب ${
            this.product?.name ?? name
          } من Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
        );

        if (this.usreId) {
          this.api
            .GetProductFavouriteByUserIdAndProductId(
              this.usreId,
              this.product.id,
              this.branchId
            )
            .pipe(
              catchError(() => of(null))
            )
            .subscribe((res) => {
              this.product.isFavourite = !!res;
            });
        } else {
          this.product.isFavourite = false;
        }

        this.loading = false;
      },
      error: () => {
        this.product = null;
        this.productNotFound = true;
        this.loading = false;
      },
    });
  }

  addToCart(product: any): void {
    // 1) تحققات المقاس (لو فيه Variants)
    const hasVariants =
      Array.isArray(product?.variants) && product.variants.length > 0;
    if (hasVariants && this.selectedSize == null) {
      this.isSizeMissing = true;
      setTimeout(
        () =>
          this.sizeRef?.nativeElement?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          }),
        0
      );
      return;
    }

    // 2) تحققات الإضافات المطلوبة
    const missing = this.validateRequiredSelections(product);
    if (missing.length) {
      this.missingRequired = new Set(missing);
      setTimeout(() => this.scrollToFirstMissing(missing[0]), 0);
      return;
    }

    // 3) ابني الـ payload حسب الفورمات المطلوب
    const variant = this.getSelectedVariant(product); // { id, name, price } أو undefined
    const selectedOptions = this.buildSelectedOptions(product); // [{ groupId, optionId }, ...]

    const payload = {
      quantity: this.quantity,
      productId: product.id,
      branchId: this.branchId,
      userId: this.usreId,
      productVariantId: variant?.id ?? null, // لو مفيش variants هيبقى null
      optionIds: selectedOptions.map((o) => o.optionId), // [1918, 1454, ...]
    };

    // console.log(payload);

    const token = localStorage.getItem('token');
    if (!token) {
      this.toastr.success("Please log in to add products to your cart.");
      // لو لازم تسجّل قبل الإضافة على السيرفر:
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    // 4) الاتصال بالـ API
    this.api.addToCart(payload).subscribe({
      next: () => {
            this.cartCountService.refresh(this.branchId, this.usreId); // تأكدي userId صح
        this.toastr.success("Great choice! It's now in your cart.");
      },

      error: (err) =>
        this.toastr.error(err?.error?.message || 'Something went wrong'),
    });
  }

  toggleFavourite(product: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    // else{
    //     this.api.GetUserId().subscribe({
    //       next: (r) => {
    //         console.log(r);

    //         this.usreId = r.userId;
    //         console.log(this.usreId);

    //       },
    //       error:(err)=>{
    //         console.log(err);

    //       }
    //     });
    // }

    const data = {
      productId: product.id,
      userId: this.usreId,
      branchId: this.branchId,
    };

    // console.log(data);

    if (product.isFavourite) {
      this.api
        .GetProductFavouriteByUserIdAndProductId(
          this.usreId,
          product.id,
          this.branchId
        )
        .pipe(catchError(() => of(null)))
        .subscribe((fav: any) => {
          if (!fav?.id) {
            product.isFavourite = false;
            return;
          }
          this.api
            .removeFromFavourite(fav.productId, this.branchId, this.usreId)
            .subscribe({
              next: () => {
                this.toastr.success('Product removed from your wishlist.');
                product.isFavourite = false;
              },
              // error: (err) => console.log(err),
            });
        });
    } else {
      this.api.addToFavourite(data).subscribe({
        next: () => {
          this.toastr.success('Product Saved to your wishlist!');
          product.isFavourite = true;
        },
        // error: (err) => console.log(err),
      });
    }
  }

  missingRequired = new Set<number>();

  private getMinSelect(group: any): number {
    return typeof group.minSelect === 'number'
      ? group.minSelect
      : group.isRequired
      ? 1
      : 0;
  }

  private isGroupValid(group: any): boolean {
    const set = this.selectedByGroup.get(group.groupId);
    const count = set?.size ?? 0;
    return count >= this.getMinSelect(group);
  }

  private validateRequiredSelections(product: any): number[] {
    const missing: number[] = [];
    product?.groups?.forEach((g: any) => {
      if (!this.isGroupValid(g)) missing.push(g.groupId);
    });
    return missing;
  }

  isGroupMissing(groupId: number): boolean {
    return this.missingRequired.has(groupId);
  }

  @ViewChildren('groupBlock') groupBlocks!: any;

  private scrollToFirstMissing(firstMissingId: number) {
    const el = this.groupBlocks?.find(
      (r: any) => r?.nativeElement?.dataset?.groupId == String(firstMissingId)
    )?.nativeElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // عدّلي toggleOption: لما الجروب يصبح سليم شيل التحذير عنه
  toggleOption(group: any, option: any): void {
    const groupId = group.groupId;
    const set = this.ensureGroupSet(groupId);

    const isMulti = group.selectionType === 1;
    const minSelect = this.getMinSelect(group);
    const maxSelect =
      typeof group.maxSelect === 'number'
        ? group.maxSelect
        : isMulti
        ? Number.POSITIVE_INFINITY
        : 1;

    const already = set.has(option.id);

    if (already) {
      if (set.size <= minSelect) return; // ماينفعش ننزل عن الحد الأدنى
      set.delete(option.id);
    } else {
      if (set.size >= maxSelect) {
        if (!isMulti) {
          set.clear();
          set.add(option.id);
        } else {
          return;
        }
      } else {
        set.add(option.id);
      }
    }
    this.selectedByGroup.set(groupId, set);

    // لو بقى الجروب صالح، شيل وسم التحذير
    if (this.isGroupValid(group)) this.missingRequired.delete(groupId);
  }

  private buildSelectedOptions(product: any): Array<{
    groupId: number;
    groupName: string;
    optionId: number;
    optionName: string;
    optionNameAr: string;
    pricePerUnit: number;
  }> {
    const result: any[] = [];
    product?.groups?.forEach((g: any) => {
      const set = this.selectedByGroup.get(g.groupId);
      if (!set) return;
      set.forEach((optId: number) => {
        const opt = g.options?.find((o: any) => o.id === optId);
        if (!opt) return;
        result.push({
          groupId: g.groupId,
          groupName: g.name,
          optionId: opt.id,
          optionName: opt.name,
          optionNameAr: opt.nameAr,
          pricePerUnit: Number(opt.price ?? 0),
        });
      });
    });
    return result;
  }

  private getSelectedVariant(
    product: any
  ): { id?: number; name?: string; nameAr?: string; price?: number } | null {
    if (this.selectedSize == null) return null;
    const v = product?.variants?.find((vv: any) => vv.id === this.selectedSize);
    if (!v) return null;
    return {
      id: v.id,
      name: v.variantName ?? v.name,
      nameAr: v.variantName ?? v.name,
      price: Number(v.price ?? 0),
    };
  }

  initVariantDefault(product: any): void {
    const variants = product?.variants ?? [];
    const def = variants.find((v: any) => v.isDefault);
    if (def) {
      this.selectedSize = def.id;
    } else if (variants.length) {
      this.selectedSize = variants[0].id;
    } else {
      this.selectedSize = null;
    }
  }

  // السايز المختار بيتخزن كـ ID (مش index)
  selectedSize: number | null = null;

  // وسم لو السايز ناقص
  isSizeMissing = false;

  // مرجع للسكرول (هتستخدميه في الـ HTML)
  @ViewChild('sizeRef') sizeRef!: any;

  selectSize(id: number): void {
    this.selectedSize = id;
    this.isSizeMissing = false; // أول ما يختار السايز، شيل الوسم الأحمر
  }

  selectedToppings = new Set<number>();

  toggleTopping(i: number) {
    if (this.selectedToppings.has(i)) {
      this.selectedToppings.delete(i);
    } else {
      this.selectedToppings.add(i);
    }
  }

  // 1) بدّل ده: selectedToppings = new Set<number>();
  // بـ Map لكل جروب:
  // private selectedByGroup = new Map<number, Set<number>>();
  private selectedByGroup = new Map<number, Set<number>>();

  // هل الخيار محدد في الجروب؟
  isSelected(groupId: number, optionId: number): boolean {
    return this.selectedByGroup.get(groupId)?.has(optionId) ?? false;
  }

  // التأكد من وجود Set لكل جروب
  private ensureGroupSet(groupId: number): Set<number> {
    if (!this.selectedByGroup.has(groupId)) {
      this.selectedByGroup.set(groupId, new Set<number>());
    }
    return this.selectedByGroup.get(groupId)!;
  }

  // (اختياري) تهيئة الديفولتس بعد ما المنتج يوصل
  // لو عندك موديلات، استخدمها. وإلا خليك على any
  initGroupDefaults(): void {
    this.product?.groups?.forEach((g: any) => {
      const set = this.ensureGroupSet(g.groupId);

      // أضف الـ defaults
      g.options?.forEach((o: any) => {
        if (o?.isDefault && typeof o.id === 'number') set.add(o.id);
      });

      // لو الجروب Required ومفيش اختيار، اختار أول Option موجود
      if (
        g.isRequired &&
        set.size === 0 &&
        Array.isArray(g.options) &&
        g.options.length > 0
      ) {
        const firstId = g.options[0]?.id;
        if (typeof firstId === 'number') set.add(firstId);
      }

      // لو Single-Select (selectionType === 0) وتسللنا لأكتر من اختيار
      if (g.selectionType === 0 && set.size > 1) {
        const it = set.values().next();
        const first = it.value as number | undefined;
        set.clear();
        if (typeof first === 'number') set.add(first);
      }

      this.selectedByGroup.set(g.groupId, set);
    });
  }

  // السعر الأساسي
  get basePrice(): number {
    return Number(this.product?.newPrice ?? this.product?.oldPrice ?? 0);
  }

  // 3) السعر النهائي
  // get finalPrice(): number {
  //   let total = this.basePrice;

  //   // زيادة/استبدال السايز (لو عندك variants)
  //   if (this.selectedSize != null && this.product?.variants?.[this.selectedSize - 1]) {
  //     const size = this.product.variants[this.selectedSize - 1];
  //     // total = Number(size.price);        // لو السايز يستبدل السعر
  //     total += Number(size.price ?? 0);     // لو السايز يزيد على السعر
  //   }

  //   // جمع أسعار اختيارات الجروبات بحسب option.id
  //   this.product?.groups?.forEach((g: any) => {
  //     const set = this.selectedByGroup.get(g.groupId);
  //     if (!set) return;
  //     set.forEach((optId: number) => {
  //       const opt = g.options?.find((o: any) => o.id === optId);
  //       if (opt) total += Number(opt.price ?? 0);
  //     });
  //   });

  //   return total;
  // }

  get finalPrice(): number {
    let total = this.basePrice;

    // ✅ هات الـ variant بالسليم
    const variant = this.getSelectedVariant(this.product);
    if (variant?.price) {
      total += Number(variant.price); // زوّدي فرق سعر السايز
    }

    // ✅ جمع أسعار اختيارات الجروبات
    this.product?.groups?.forEach((g: any) => {
      const set = this.selectedByGroup.get(g.groupId);
      if (!set) return;
      set.forEach((optId: number) => {
        const opt = g.options?.find((o: any) => o.id === optId);
        if (opt) total += Number(opt.price ?? 0); // أو pricePerUnit لو اسمك كده
      });
    });

    return total;
  }

  // خريطة للاختيارات في كل جروب
}
