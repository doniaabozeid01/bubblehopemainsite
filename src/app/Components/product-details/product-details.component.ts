import { animate, style, transition, trigger } from '@angular/animations';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { CartCountService } from 'src/app/services/cart-count.service';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';
import {
  hasOptionImage as optionHasImage,
  hasVariantImage as variantHasImage,
  resolveOptionImagePath,
  resolveProductGalleryImage,
  resolveVariantImagePath,
} from 'src/app/utils/product-image.util';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss'],
  animations: [
    trigger('priceChange', [
      transition(':enter', [
        style({
          transform: 'translateY(-12px)',
          opacity: 0,
          position: 'absolute',
          insetInlineStart: 0,
          insetBlockEnd: 0,
        }),
        animate(
          '300ms 240ms ease-out',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({
          position: 'absolute',
          insetInlineStart: 0,
          insetBlockEnd: 0,
        }),
        animate(
          '240ms ease-in',
          style({ transform: 'translateY(12px)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class ProductDetailsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('galleryTrack') galleryTrack?: ElementRef<HTMLElement>;
  @ViewChild('gallerySticky') gallerySticky?: ElementRef<HTMLElement>;
  @ViewChild('checkoutWrap') checkoutWrap?: ElementRef<HTMLElement>;
  @ViewChild('checkoutBar') checkoutBar?: ElementRef<HTMLElement>;
  product: any = null;
  cartId!: number;
  usreId!: string;
  branchId!: any;
  loading = true;
  productNotFound = false;
  quantity = 1;
  orderNote = '';
  readonly maxOrderNoteLength = 250;
  private returnCategoryId: number | null = null;
  private returnTab: 'offers' | 'best' | null = null;
  private galleryStickyFrame = 0;

  constructor(
    private cartCountService: CartCountService,
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
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
    const text = this.isAr
      ? p?.ingredients_ar ?? p?.ingredients
      : p?.ingredients ?? p?.ingredients_ar;
    return text?.trim() || '';
  }

  currencyLabel(p: any): string {
    return this.isAr ? p?.currency_ar ?? p?.currency : p?.currency ?? p?.currency_ar;
  }

  productImage(p: any): string {
    return resolveProductGalleryImage(p);
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

  getOptionPrice(option: any): number {
    return Number(option?.price ?? 0);
  }

  hasOptionImage(option: any): boolean {
    return optionHasImage(option);
  }

  getOptionImage(option: any): string {
    return resolveOptionImagePath(option);
  }

  hasVariantImage(variant: any): boolean {
    return variantHasImage(variant);
  }

  getSizeVariantImagePath(variant: any): string {
    const fromApi = resolveVariantImagePath(variant, '');
    if (fromApi && fromApi !== 'assets/img/placeholder.png') return fromApi;

    const label = `${variant?.name || ''} ${variant?.nameAr || ''}`.toLowerCase();
    if (/cone|كون/i.test(label)) {
      return 'assets/images/ice-cream-cone.svg';
    }
    return 'assets/images/ice-cream-cup.svg';
  }

  getSizePrice(size: any): number {
    return Number((this.basePrice + Number(size?.price ?? 0)).toFixed(2));
  }

  getVariantExtraPrice(size: any): number {
    return Number(size?.price ?? 0);
  }

  isIceCreamProduct(product: any): boolean {
    const category = `${product?.category?.name || ''} ${product?.category?.name_ar || ''}`.toLowerCase();
    return /ice\s*cream|icecream|آيس\s*كريم|ايس\s*كريم/i.test(category);
  }

  isMultiGroup(group: any): boolean {
    return group?.selectionType === 1 || this.isFlavorGroup(group);
  }

  isFlavorGroup(group: any): boolean {
    const label = `${group?.name || ''} ${group?.nameAr || ''}`.toLowerCase();
    return /flavor|فلافر|نكه|اختر النكه/i.test(label);
  }

  getCategoryProductsLink(): (string | number)[] {
    const id = this.returnCategoryId ?? this.product?.category?.id;
    return id ? ['/products', id] : ['/products'];
  }

  goBack(): void {
    this.router.navigate(this.getCategoryProductsLink());
  }

  private isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return (
      !!token &&
      token !== 'null' &&
      token !== 'undefined' &&
      token.trim() !== ''
    );
  }

  private requireLogin(): boolean {
    if (this.isAuthenticated()) return true;

    this.toastr.warning(this.translate.instant('productDetails.loginRequired'));
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: this.router.url },
    });
    return false;
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

  trackByPrice(_index: number, price: number): number {
    return price;
  }

  get totalPrice(): number {
    return Number((this.unitPrice * this.quantity).toFixed(2));
  }

  get unitPrice(): number {
    return this.finalPrice;
  }

  ngAfterViewInit(): void {
    this.scheduleGalleryStickyUpdate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.galleryStickyFrame);
    this.resetGallerySticky();
    this.resetCheckoutDock();
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onGalleryViewportChange(): void {
    this.scheduleGalleryStickyUpdate();
  }

  private scheduleGalleryStickyUpdate(): void {
    cancelAnimationFrame(this.galleryStickyFrame);
    this.galleryStickyFrame = requestAnimationFrame(() => {
      this.updateGallerySticky();
      this.updateCheckoutDock();
    });
  }

  private isCheckoutDockEnabled(): boolean {
    return window.matchMedia('(max-width: 1023px)').matches;
  }

  private getCheckoutBottomGap(): number {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('env(safe-area-inset-bottom)')
      .trim();
    return 12 + (Number.parseFloat(value) || 0);
  }

  private getCheckoutSideGap(): number {
    const container = this.checkoutWrap?.nativeElement.closest('.details-container');
    if (!container) return 16;
    const styles = getComputedStyle(container);
    return Math.max(
      Number.parseFloat(styles.paddingLeft) || 16,
      Number.parseFloat(styles.paddingRight) || 16
    );
  }

  private updateCheckoutDock(): void {
    const wrap = this.checkoutWrap?.nativeElement;
    const bar = this.checkoutBar?.nativeElement;
    if (!wrap || !bar) return;

    if (!this.isCheckoutDockEnabled()) {
      this.resetCheckoutDock();
      return;
    }

    const barHeight = bar.offsetHeight;
    const bottomGap = this.getCheckoutBottomGap();
    const sideGap = this.getCheckoutSideGap();
    const stickLine = window.innerHeight - bottomGap - barHeight;
    const wrapRect = wrap.getBoundingClientRect();

    if (wrapRect.top <= stickLine) {
      wrap.style.minHeight = '';
      this.resetCheckoutDock();
      return;
    }

    const container = wrap.closest('.details-container');
    const containerRect = container?.getBoundingClientRect();

    wrap.style.minHeight = `${barHeight}px`;
    bar.classList.add('details-checkout--docked');
    bar.style.position = 'fixed';
    bar.style.bottom = `${bottomGap}px`;
    bar.style.zIndex = '9000';

    if (containerRect) {
      bar.style.left = `${containerRect.left}px`;
      bar.style.width = `${containerRect.width}px`;
      bar.style.right = '';
    } else {
      bar.style.left = `${sideGap}px`;
      bar.style.right = `${sideGap}px`;
      bar.style.width = '';
    }
  }

  private resetCheckoutDock(): void {
    const wrap = this.checkoutWrap?.nativeElement;
    const bar = this.checkoutBar?.nativeElement;
    if (wrap) wrap.style.minHeight = '';
    if (!bar) return;

    bar.classList.remove('details-checkout--docked');
    bar.style.position = '';
    bar.style.left = '';
    bar.style.right = '';
    bar.style.bottom = '';
    bar.style.width = '';
    bar.style.zIndex = '';
  }

  private getGalleryStickyTop(): number {
    const raw = getComputedStyle(this.galleryTrack?.nativeElement ?? document.documentElement)
      .getPropertyValue('--app-header-height')
      .trim();
    const base = Number.parseFloat(raw) || 128;
    return base + 16;
  }

  private isGalleryStickyEnabled(): boolean {
    return window.matchMedia('(min-width: 1024px)').matches;
  }

  private updateGallerySticky(): void {
    const track = this.galleryTrack?.nativeElement;
    const sticky = this.gallerySticky?.nativeElement;
    if (!track || !sticky) return;

    if (!this.isGalleryStickyEnabled()) {
      this.resetGallerySticky();
      return;
    }

    const topOffset = this.getGalleryStickyTop();
    const trackRect = track.getBoundingClientRect();
    const stickyHeight = sticky.offsetHeight;
    const bottomLimit = trackRect.bottom - stickyHeight;

    if (trackRect.top >= topOffset) {
      this.resetGallerySticky();
      return;
    }

    if (bottomLimit <= topOffset) {
      sticky.style.position = 'absolute';
      sticky.style.top = `${track.offsetHeight - stickyHeight}px`;
      sticky.style.left = '0';
      sticky.style.right = '0';
      sticky.style.width = '100%';
      sticky.style.zIndex = '5';
      return;
    }

    sticky.style.position = 'fixed';
    sticky.style.top = `${topOffset}px`;
    sticky.style.left = `${trackRect.left}px`;
    sticky.style.width = `${trackRect.width}px`;
    sticky.style.right = 'auto';
    sticky.style.zIndex = '5';
  }

  private resetGallerySticky(): void {
    const sticky = this.gallerySticky?.nativeElement;
    if (!sticky) return;

    sticky.style.position = '';
    sticky.style.top = '';
    sticky.style.left = '';
    sticky.style.right = '';
    sticky.style.width = '';
    sticky.style.zIndex = '';
  }

  ngOnInit() {
    const name = decodeURIComponent(
      this.route.snapshot.paramMap.get('name') ?? ''
    );
    const categoryIdParam = this.route.snapshot.queryParamMap.get('categoryId');
    const tabParam = this.route.snapshot.queryParamMap.get('tab');

    if (categoryIdParam) {
      this.returnCategoryId = +categoryIdParam;
    }
    if (tabParam === 'offers' || tabParam === 'best') {
      this.returnTab = tabParam;
    }

    if (this.isAuthenticated()) {
      this.api.GetUserId().subscribe({
        next: (r) => {
          this.usreId = r.userId;
        },
      });
    }

    this.branchService.currentBranch$.subscribe((bid) => {
      this.branchId = bid;

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

      this.loadProduct(name);
    });
  }

  loadProduct(name: string) {
    if (!name?.trim() || !this.branchId) return;

    this.loading = true;
    this.productNotFound = false;

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
        this.orderNote = '';
        this.selectedByGroup.clear();
        this.optionQuantitiesByGroup.clear();
        this.missingRequired.clear();
        this.isSizeMissing = false;
        this.selectedSize = null;
        this.initVariantDefault(this.product);
        this.initGroupDefaults();

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
            .pipe(catchError(() => of(null)))
            .subscribe((res) => {
              this.product.isFavourite = !!res;
            });
        } else {
          this.product.isFavourite = false;
        }

        this.loading = false;
        setTimeout(() => this.scheduleGalleryStickyUpdate(), 0);
      },
      error: () => {
        this.product = null;
        this.productNotFound = true;
        this.loading = false;
      },
    });
  }

  addToCart(product: any): void {
    if (!this.requireLogin()) return;

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

    const missing = this.validateRequiredSelections(product);
    if (missing.length) {
      this.missingRequired = new Set(missing);
      setTimeout(() => this.scrollToFirstMissing(missing[0]), 0);
      return;
    }

    const variant = this.getSelectedVariant(product);
    const optionIds = this.buildOptionIds(product);
    const note = this.orderNote.trim();

    const payload = {
      quantity: this.quantity,
      productId: product.id,
      branchId: this.branchId,
      userId: this.usreId,
      productVariantId: variant?.id ?? null,
      optionIds,
      note: note || null,
    };

    this.api.addToCart(payload).subscribe({
      next: () => {
        this.cartCountService.refresh(this.branchId, this.usreId);
        this.toastr.success("Great choice! It's now in your cart.");
      },
      error: (err) =>
        this.toastr.error(err?.error?.message || 'Something went wrong'),
    });
  }

  private buildOptionIds(product: any): number[] {
    const optionIds: number[] = [];
    product?.groups?.forEach((g: any) => {
      if (this.isFlavorGroup(g)) {
        const qtyMap = this.optionQuantitiesByGroup.get(g.groupId);
        if (!qtyMap) return;
        qtyMap.forEach((qty, optId) => {
          for (let i = 0; i < qty; i++) optionIds.push(optId);
        });
        return;
      }

      const set = this.selectedByGroup.get(g.groupId);
      if (!set) return;
      set.forEach((optId: number) => optionIds.push(optId));
    });
    return optionIds;
  }

  toggleFavourite(product: any) {
    if (!this.requireLogin()) return;

    const data = {
      productId: product.id,
      userId: this.usreId,
      branchId: this.branchId,
    };

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
            });
        });
    } else {
      this.api.addToFavourite(data).subscribe({
        next: () => {
          this.toastr.success('Product Saved to your wishlist!');
          product.isFavourite = true;
        },
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

  private getMaxSelect(group: any): number {
    if (typeof group.maxSelect === 'number') return group.maxSelect;
    if (group.selectionType === 1 || this.isFlavorGroup(group)) {
      return Number.POSITIVE_INFINITY;
    }
    return 1;
  }

  private isGroupValid(group: any): boolean {
    const count = this.isFlavorGroup(group)
      ? this.getGroupTotalQuantity(group.groupId)
      : this.selectedByGroup.get(group.groupId)?.size ?? 0;
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

  toggleOption(group: any, option: any): void {
    const groupId = group.groupId;
    const set = this.ensureGroupSet(groupId);

    const isMulti = group.selectionType === 1;
    const minSelect = this.getMinSelect(group);
    const maxSelect = this.getMaxSelect(group);

    const already = set.has(option.id);

    if (already) {
      if (set.size <= minSelect) return;
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

    if (this.isGroupValid(group)) this.missingRequired.delete(groupId);
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
      nameAr: v.variantName ?? v.nameAr ?? v.name,
      price: Number(v.price ?? 0),
    };
  }

  initVariantDefault(product: any): void {
    const variants = product?.variants ?? [];
    const def = variants.find((v: any) => v.isDefault);
    if (def) {
      this.selectedSize = def.id;
      return;
    }

    if (variants.length && this.isIceCreamProduct(product)) {
      this.selectedSize = variants[0].id;
    } else if (variants.length) {
      this.selectedSize = variants[0].id;
    } else {
      this.selectedSize = null;
    }
  }

  selectedSize: number | null = null;
  isSizeMissing = false;

  @ViewChild('sizeRef') sizeRef!: any;

  selectSize(id: number): void {
    this.selectedSize = id;
    this.isSizeMissing = false;
  }

  private selectedByGroup = new Map<number, Set<number>>();
  private optionQuantitiesByGroup = new Map<number, Map<number, number>>();

  isSelected(groupId: number, optionId: number): boolean {
    return this.selectedByGroup.get(groupId)?.has(optionId) ?? false;
  }

  private ensureGroupSet(groupId: number): Set<number> {
    if (!this.selectedByGroup.has(groupId)) {
      this.selectedByGroup.set(groupId, new Set<number>());
    }
    return this.selectedByGroup.get(groupId)!;
  }

  getOptionQuantity(groupId: number, optionId: number): number {
    return this.optionQuantitiesByGroup.get(groupId)?.get(optionId) ?? 0;
  }

  getGroupTotalQuantity(groupId: number): number {
    const qtyMap = this.optionQuantitiesByGroup.get(groupId);
    if (!qtyMap) return 0;
    let total = 0;
    qtyMap.forEach((qty) => {
      total += qty;
    });
    return total;
  }

  canIncreaseFlavorQuantity(group: any): boolean {
    return this.getGroupTotalQuantity(group.groupId) < this.getMaxSelect(group);
  }

  increaseFlavorQuantity(group: any, option: any): void {
    if (!this.canIncreaseFlavorQuantity(group)) return;

    const qtyMap = this.ensureFlavorQuantities(group.groupId);
    qtyMap.set(option.id, (qtyMap.get(option.id) ?? 0) + 1);

    if (this.isGroupValid(group)) {
      this.missingRequired.delete(group.groupId);
    }
  }

  decreaseFlavorQuantity(group: any, option: any): void {
    const groupId = group.groupId;
    const qtyMap = this.ensureFlavorQuantities(groupId);
    const current = qtyMap.get(option.id) ?? 0;
    if (current <= 0) return;

    const nextTotal = this.getGroupTotalQuantity(groupId) - 1;
    if (group.isRequired && nextTotal < this.getMinSelect(group)) return;

    const next = current - 1;
    if (next <= 0) qtyMap.delete(option.id);
    else qtyMap.set(option.id, next);

    if (this.isGroupValid(group)) {
      this.missingRequired.delete(groupId);
    }
  }

  toggleFlavorOption(group: any, option: any): void {
    const groupId = group.groupId;
    const qtyMap = this.ensureFlavorQuantities(groupId);
    const current = qtyMap.get(option.id) ?? 0;

    if (current > 0) {
      const nextTotal = this.getGroupTotalQuantity(groupId) - current;
      if (group.isRequired && nextTotal < this.getMinSelect(group)) return;
      qtyMap.delete(option.id);
    } else {
      if (!this.canIncreaseFlavorQuantity(group)) return;
      qtyMap.set(option.id, 1);
    }

    if (this.isGroupValid(group)) {
      this.missingRequired.delete(groupId);
    }
  }

  private ensureFlavorQuantities(groupId: number): Map<number, number> {
    if (!this.optionQuantitiesByGroup.has(groupId)) {
      this.optionQuantitiesByGroup.set(groupId, new Map<number, number>());
    }
    return this.optionQuantitiesByGroup.get(groupId)!;
  }

  initGroupDefaults(): void {
    this.product?.groups?.forEach((g: any) => {
      if (this.isFlavorGroup(g)) {
        const qtyMap = this.ensureFlavorQuantities(g.groupId);

        g.options?.forEach((o: any) => {
          if (o?.isDefault && typeof o.id === 'number') {
            qtyMap.set(o.id, 1);
          }
        });

        if (
          g.isRequired &&
          this.getGroupTotalQuantity(g.groupId) === 0 &&
          Array.isArray(g.options) &&
          g.options.length > 0
        ) {
          const firstId = g.options[0]?.id;
          if (typeof firstId === 'number') qtyMap.set(firstId, 1);
        }

        return;
      }

      const set = this.ensureGroupSet(g.groupId);

      g.options?.forEach((o: any) => {
        if (o?.isDefault && typeof o.id === 'number') set.add(o.id);
      });

      if (
        g.isRequired &&
        set.size === 0 &&
        Array.isArray(g.options) &&
        g.options.length > 0
      ) {
        const firstId = g.options[0]?.id;
        if (typeof firstId === 'number') set.add(firstId);
      }

      if (g.selectionType === 0 && set.size > 1) {
        const it = set.values().next();
        const first = it.value as number | undefined;
        set.clear();
        if (typeof first === 'number') set.add(first);
      }

      this.selectedByGroup.set(g.groupId, set);
    });
  }

  get basePrice(): number {
    return Number(this.product?.newPrice ?? this.product?.oldPrice ?? 0);
  }

  get finalPrice(): number {
    let total = this.basePrice;

    const variant = this.getSelectedVariant(this.product);
    if (variant?.price) {
      total += Number(variant.price);
    }

    this.product?.groups?.forEach((g: any) => {
      if (this.isFlavorGroup(g)) {
        const qtyMap = this.optionQuantitiesByGroup.get(g.groupId);
        if (!qtyMap) return;
        qtyMap.forEach((qty, optId) => {
          const opt = g.options?.find((o: any) => o.id === optId);
          if (opt) total += Number(opt.price ?? 0) * qty;
        });
        return;
      }

      const set = this.selectedByGroup.get(g.groupId);
      if (!set) return;
      set.forEach((optId: number) => {
        const opt = g.options?.find((o: any) => o.id === optId);
        if (opt) total += Number(opt.price ?? 0);
      });
    });

    return Number(total.toFixed(2));
  }
}
