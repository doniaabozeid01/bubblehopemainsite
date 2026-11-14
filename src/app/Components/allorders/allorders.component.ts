import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subscription, timer } from 'rxjs';
import { ActiveOrdersService } from 'src/app/services/active-orders.service';
import { ApiService } from 'src/app/services/api.service';
import { LanguageService } from 'src/app/services/language.service';
import { SeoService } from 'src/app/services/seo.service';

/** Order progress shown on current orders. */
const STEPS = ['pending', 'confirmed', 'shipped', 'delivered'] as const;

/** Other spellings the backend may use -> one of STEPS. */
const STATUS_ALIASES: Record<string, string> = {
  preparing: 'confirmed',
  accepted: 'confirmed',
  processing: 'confirmed',
  ready: 'confirmed',
  outfordelivery: 'shipped',
  'out for delivery': 'shipped',
  ontheway: 'shipped',
  completed: 'delivered',
  cancelled: 'canceled',
};

const KNOWN_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'canceled'];

/** How often the page re-checks the server for status changes. */
const LIVE_REFRESH_MS = 4000;
/** Slower check when nothing is in progress (e.g. to notice a brand-new order). */
const IDLE_EVERY_N_TICKS = 8;

@Component({
  selector: 'app-allorders',
  templateUrl: './allorders.component.html',
  styleUrls: ['./allorders.component.scss']
})
export class AllordersComponent implements OnInit, OnDestroy {
  orders: any;
  activeOrders: any[] = [];
  pastOrders: any[] = [];
  readonly steps = STEPS;

  /** Every order of the customer (all branches); activeOrders/pastOrders are the filtered view. */
  private allOrders: any[] = [];
  private branches: any[] = [];
  selectedBranchId: number | null = null;
  branchFilters: { id: number; label: string }[] = [];

  isLoggedIn: boolean = true;
  showScrollButton = false;

  private userId = '';
  private pollSub?: Subscription;
  private ticks = 0;
  private lastStatuses = new Map<number, string>();

  constructor(
    private api: ApiService,
    private route: Router,
    public languageService: LanguageService,
    private seoService: SeoService,
    private activeOrdersService: ActiveOrdersService,
    private translate: TranslateService,
    private toastr: ToastrService
  ) { }

  ngOnInit() {
    this.api.GetUserId().subscribe({
      next: (res) => {
        this.seoService.updateTitleAndDescription(
          `Orders | Bubble Hope`,
          `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
        );

        if (!res?.userId) {
          this.isLoggedIn = false;
          return;
        }

        this.userId = res.userId;
        this.loadOrders();

        // Branch names for the labels / filter; the orders still show without them.
        this.api.getAllBranches().subscribe({
          next: (list: any) => {
            this.branches = Array.isArray(list) ? list : [];
            this.applyFilter();
          },
          error: () => { /* labels fall back to whatever the order carries */ }
        });

        // Near-live updates: while an order is in progress, re-check every few seconds
        // (only while the tab is visible), and catch up instantly when the user returns.
        this.pollSub = timer(LIVE_REFRESH_MS, LIVE_REFRESH_MS).subscribe(() => {
          if (document.hidden) return;
          if (this.activeOrders.length === 0 && ++this.ticks % IDLE_EVERY_N_TICKS !== 0) return;
          this.loadOrders();
        });
      },
      error: () => {
        this.isLoggedIn = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  @HostListener('document:visibilitychange')
  @HostListener('window:focus')
  @HostListener('window:online')
  onBackInView(): void {
    if (this.userId && !document.hidden) this.loadOrders();
  }

  /** Tell the customer right away when an order moves to a new status. */
  private notifyChanges(list: any[]): void {
    for (const o of list) {
      const id = o?.orderId;
      if (id === undefined || id === null) continue;
      const status = this.normStatus(o?.status);
      const before = this.lastStatuses.get(id);
      if (before !== undefined && before !== status) {
        const key = this.statusKey(o?.status);
        const label = key ? this.translate.instant(key) : String(o?.status ?? '');
        this.toastr.info(this.translate.instant('orders.updated', { id, status: label }));
      }
      this.lastStatuses.set(id, status);
    }
  }

  private loadOrders(): void {
    this.api.getOrdersByUserId(this.userId).subscribe({
      next: (response) => {
        this.setOrders(Array.isArray(response) ? response : []);
      },
      error: () => {
        // Keep what is already on screen if a background refresh fails.
        if (this.orders === undefined) this.setOrders([]);
      }
    });
  }

  /** Newest first, split into "in progress" and "finished". */
  private setOrders(list: any[]): void {
    const sorted = [...list].sort((a: any, b: any) => b.orderId - a.orderId);
    this.notifyChanges(sorted);
    this.orders = sorted;
    this.allOrders = sorted;
    this.applyFilter();
    // The navbar badge always counts every branch, whatever the page filter says.
    this.activeOrdersService.setFromOrders(sorted);
  }

  /** Re-split the orders after the data or the branch filter changed. */
  private applyFilter(): void {
    const ids = this.branchIdsInOrders();
    // If the chosen branch no longer has orders, fall back to "all".
    if (this.selectedBranchId !== null && !ids.includes(this.selectedBranchId)) {
      this.selectedBranchId = null;
    }
    const visible = this.selectedBranchId === null
      ? this.allOrders
      : this.allOrders.filter((o) => this.orderBranchId(o) === this.selectedBranchId);

    this.activeOrders = visible.filter((o) => ActiveOrdersService.isActiveStatus(o?.status));
    this.pastOrders = visible.filter((o) => !ActiveOrdersService.isActiveStatus(o?.status));
    this.branchFilters = ids.map((id) => ({ id, label: this.branchName(id) }));
  }

  /** Branch id of an order, if the API sends one. */
  private orderBranchId(order: any): number | null {
    const raw = order?.branchId ?? order?.branchID ?? order?.branch?.id;
    const id = Number(raw);
    return raw === undefined || raw === null || !Number.isFinite(id) ? null : id;
  }

  private branchIdsInOrders(): number[] {
    const ids = new Set<number>();
    for (const o of this.allOrders) {
      const id = this.orderBranchId(o);
      if (id !== null) ids.add(id);
    }
    return [...ids];
  }

  private branchName(id: number): string {
    const b = this.branches.find((x) => Number(x.id) === id);
    const ar = this.translate.currentLang === 'ar';
    return (ar ? b?.name_ar ?? b?.name : b?.name ?? b?.name_ar) ?? '';
  }

  /** Branch name shown on an order card (empty when unknown). */
  branchLabel(order: any): string {
    const id = this.orderBranchId(order);
    const fromList = id !== null ? this.branchName(id) : '';
    return fromList || order?.branchName || order?.branch?.name || '';
  }

  selectBranch(id: number | null): void {
    this.selectedBranchId = id;
    this.applyFilter();
  }

  trackByBranch = (_: number, f: { id: number }) => f.id;

  trackByOrder = (_: number, order: any) => order?.orderId;

  private normStatus(status: string | null | undefined): string {
    const s = String(status ?? '').trim().toLowerCase();
    return STATUS_ALIASES[s] ?? s;
  }

  /** Translation key for known statuses, or null to show the raw text. */
  statusKey(status: string | null | undefined): string | null {
    const s = this.normStatus(status);
    return KNOWN_STATUSES.includes(s) ? `orders.status.${s}` : null;
  }

  /** Position in the progress tracker, or -1 when the status is not part of it. */
  stepIndex(status: string | null | undefined): number {
    return (STEPS as readonly string[]).indexOf(this.normStatus(status));
  }
  getStatusClass(status: string): string {
    switch (this.normStatus(status)) {
      case 'pending':
        return 'bg-warning text-dark';      // أصفر
      case 'confirmed':
        return 'bg-info text-white';        // أزرق فاتح
      case 'shipped':
        return 'bg-primary text-white';     // أزرق غامق
      case 'delivered':
        return 'bg-success text-white';     // أخضر
      case 'canceled':
        return 'bg-danger text-white';      // أحمر
      default:
        return 'bg-secondary text-white';   // رمادي افتراضي
    }
  }



  goToLogin() {
    this.route.navigate(["/auth/login"]);
  }



  goToProducts() {
    this.route.navigate(["/products"]);
  }
 @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.showScrollButton = scrollPosition > 300;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getDeliveryFee(order: any): number {
    return Number(order?.deliveryFee ?? 0);
  }

  /** مجموع المنتجات فقط (بدون توصيل). */
  getOrderSubtotal(order: any): number {
    const items = order?.orderItems ?? [];
    if (items.length > 0) {
      const fromItems = items.reduce((sum: number, item: any) => {
        const lineTotal = Number(item.totalPrice ?? item.lineTotal ?? 0);
        if (lineTotal > 0) {
          return sum + lineTotal;
        }
        return sum + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 1);
      }, 0);
      if (fromItems > 0) {
        return fromItems;
      }
    }

    const grandTotal = Number(order?.totalAmount ?? 0);
    const delivery = this.getDeliveryFee(order);
    if (delivery > 0 && grandTotal >= delivery) {
      return grandTotal - delivery;
    }
    return grandTotal;
  }

  /** الإجمالي النهائي (بدون إضافة التوصيل مرتين). */
  getOrderGrandTotal(order: any): number {
    const stored = Number(order?.totalAmount ?? 0);
    const delivery = this.getDeliveryFee(order);
    const subtotal = this.getOrderSubtotal(order);

    if (delivery <= 0) {
      return stored;
    }

    // السيرفر يخزّن الإجمالي شامل التوصيل في totalAmount
    if (stored > subtotal) {
      return stored;
    }

    return subtotal + delivery;
  }
}
