import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { BranchService } from 'src/app/services/branch.service';
import { CartCountService } from 'src/app/services/cart-count.service';
import { WishlistCountService } from 'src/app/services/wishlist-count.service';
import { LanguageService } from 'src/app/services/language.service';
import {
  RawCategoriesService,
  RawCategoryLink,
  rawCategoryLink,
} from 'src/app/services/raw-categories.service';

/** Shown until the API answers; real categories replace them. */
const RAW_NAV_DEFAULTS = [
  { titleKey: 'navbar.tapioca' },
  { titleKey: 'navbar.juice' },
  { titleKey: 'navbar.popping' },
];

const RAW_NAV_LIMIT = 4;

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  categories: any;
  branches: any;
  userId!: string;
  user: any;
  isMenuOpen = false;
  scrolled = false;
  isHome = false;
  /** Transparent bar over a full-bleed dark hero */
  isOverlay = false;
  /** Glass pill from the top (no cream band) over a split hero */
  isFloating = false;
  /** Force-hide Products mega after a click until the mouse leaves */
  megaClosed = false;
  rawNav: RawCategoryLink[] = RAW_NAV_DEFAULTS.map(rawCategoryLink);

  selectedBranchName: string = '';
  branchId: number | null = null;
  cartCount = 0;
  wishlistCount = 0;

  private routerSub?: Subscription;

  constructor(
    private cartCountService: CartCountService,
    private wishlistCountService: WishlistCountService,
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private branchService: BranchService,
    private toastr: ToastrService,
    public languageService: LanguageService,
    public api: ApiService,
    private rawCategories: RawCategoriesService
  ) {}

  ngOnInit(): void {
    this.scrolled = window.scrollY > 24;
    this.updateHomeFlag();

    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updateHomeFlag();
        this.closeMenu();
        (document.activeElement as HTMLElement | null)?.blur?.();
      });

    this.authService.currentUser$.subscribe((u) => {
      this.user = u;
    });
    this.cartCountService.cartCount$.subscribe((c) => (this.cartCount = c));
    this.wishlistCountService.wishlistCount$.subscribe((c) => (this.wishlistCount = c));

    const token = localStorage.getItem('token');
    if (token) {
      this.apiService.GetUserId().subscribe({
        next: (res) => {
          this.userId = typeof res === 'string' ? res : res?.userId;

          if (this.userId) {
            // Tracked apart from branchId: the other currentBranch$ subscribers update branchId
            // first, which used to make this one think nothing changed and keep stale counts.
            let countsBranchId = 0;
            this.branchService.currentBranch$.subscribe((branchId) => {
              const id = Number(branchId);
              if (!id || id === countsBranchId) return;
              const switched = countsBranchId !== 0;
              countsBranchId = id;
              this.branchId = id;
              if (switched) {
                this.cartCountService.setCount(0);
                this.wishlistCountService.setCount(0);
              }
              this.cartCountService.refresh(id, this.userId);
              this.wishlistCountService.refresh(id, this.userId);
            });
          }
        },
        error: (err) => {
          console.error('❌ Error getting userId:', err);
          this.cartCountService.setCount(0);
          this.wishlistCountService.clear();
        },
      });
    } else {
      this.wishlistCountService.clear();
    }

    this.branchService.currentBranch$.subscribe((branchId) => {
      if (branchId) {
        this.branchId = branchId;
      }
    });

    this.rawCategories.getCategories().subscribe({
      next: (cats) => {
        if (!cats?.length) return;
        this.rawNav = cats.map(rawCategoryLink);
      },
      error: () => {},
    });

    this.apiService.getAllCategories(this.apiService.drinks).subscribe({
      next: (data) => {
        this.categories = Array.isArray(data)
          ? data
          : data?.data || data?.result || data?.categories || [];
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.categories = [];
      },
    });

    this.apiService.getAllBranches().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : data?.data || data?.result || [];
        this.branches = Array.isArray(list) ? list : [];
        const currentId = this.branchService.getCurrentBranch() || this.branchId;
        if (currentId) this.updateBranchName(Number(currentId));
      },
      error: (err) => {
        console.error('Error loading branches:', err);
      },
    });

    this.branchService.currentBranch$.subscribe((id) => {
      if (!id) return;
      this.branchId = id;
      this.updateBranchName(id);
    });

    this.languageService.languageChanged$.subscribe(() => {
      if (this.branchId) this.updateBranchName(this.branchId);
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    document.body.style.overflow = '';
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const next = window.scrollY > 24;
    if (next === this.scrolled) return;
    this.scrolled = next;
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
  }

  closeMenu(): void {
    this.isMenuOpen = false;
    document.body.style.overflow = '';
  }

  closeMega(): void {
    this.megaClosed = true;
    const active = document.activeElement as HTMLElement | null;
    active?.blur?.();
  }

  onMegaEnter(): void {
    this.megaClosed = false;
  }

  onMegaLeave(): void {
    this.megaClosed = false;
  }

  // ngOnInit(): void {
  //   // 1. إغلاق القائمة
  //   this.router.events.subscribe(() => (this.isMenuOpen = false));

  //   // 2. متابعة المستخدم
  //   this.authService.currentUser$.subscribe((u) => (this.user = u));

  //   // 3. عداد السلة
  //   this.cartCountService.cartCount$.subscribe((c) => (this.cartCount = c));

  //   // 4. جلب الـ ID المبدئي (مهم جداً يكون هنا قبل تحميل الفروع)
  //   const savedBranchId = this.branchService.getCurrentBranch();
  //   if (savedBranchId) {
  //     this.branchId = Number(savedBranchId);
  //   }

  //   // 5. تحميل الـ Categories
  //   this.apiService.getAllCategories(this.apiService.drinks).subscribe({
  //     next: (data) => (this.categories = data),
  //   });

  //   // 6. تحميل الفروع وتحديث الاسم فوراً عند الوصول
  //   this.apiService.getAllBranches().subscribe({
  //     next: (data) => {
  //       this.branches = data;
  //       console.log('Branches loaded:', this.branches);
  //       // بمجرد وصول الفروع، لو معانا ID قديم نحدث الاسم فوراً
  //       if (this.branchId) {
  //         this.updateBranchName(this.branchId);
  //       }
  //     },
  //   });

  //   // 7. مراقب التغيير (بيشتغل لما المستخدم يختار فرع جديد)
  //   this.branchService.currentBranch$.subscribe((id) => {
  //     if (id) {
  //       this.branchId = id;
  //       // لا تحدث الاسم إلا لو مصفوفة الفروع جاهزة
  //       if (this.branches && this.branches.length > 0) {
  //         this.updateBranchName(id);
  //       }

  //       if (this.userId) {
  //         this.cartCountService.refresh(id, this.userId);
  //       }
  //     }
  //   });

  //   // 8. جلب بيانات المستخدم لو مسجل
  //   const token = localStorage.getItem('token');
  //   if (token) {
  //     this.apiService.GetUserId().subscribe({
  //       next: (res) => {
  //         this.userId = typeof res === 'string' ? res : res?.userId;
  //         if (this.userId && this.branchId) {
  //           this.cartCountService.refresh(this.branchId, this.userId);
  //         }
  //       }
  //     });
  //   } else {
  //     this.GetDefaultBranch();
  //   }
  // }

  updateBranchName(id: any) {
    // حولنا الـ id لرقم عشان نضمن المقارنة الصح
    const numericId = Number(id);

    if (numericId && this.branches && this.branches.length > 0) {
      // البحث باستخدام == بدلاً من === لمرونة أكثر
      const branch = this.branches.find((b: any) => b.id == numericId);

      if (branch) {
        // الهروب من خطأ الـ translateService اللي ظهر في الـ Terminal
        const isAr =
          document.documentElement.dir === 'rtl' ||
          localStorage.getItem('lang') === 'ar';

        this.selectedBranchName = isAr
          ? branch.name_ar || branch.name
          : branch.name || branch.name_ar;
      }
    }
  }

  logout() {
    this.authService.logout();
    this.cartCountService.setCount(0);
    this.wishlistCountService.clear();
    this.router.navigate(['/home']);
  }

  /** Switch locally once (every page reacts to currentBranch$), then sync the account on the server. */
  switchBranch(branchId: number) {
    const current = Number(this.branchService.getCurrentBranch());
    if (current === Number(branchId) && this.branchService.hasChosenBranch()) return;

    this.branchService.setBranch(branchId);
    this.updateBranchName(branchId);

    if (!localStorage.getItem('token')) return;

    this.apiService.GetUserId().subscribe({
      next: (res) => {
        const userId = typeof res === 'string' ? res : res?.userId;
        if (!userId) return;
        this.userId = userId;

        this.apiService.switchBranch({ userId, newBranchId: branchId }).subscribe({
          next: () => this.toastr.success('Branch switched successfully.'),
          error: (err) =>
            this.toastr.error(err?.error?.message || 'Failed to switch branch on server.'),
        });
      },
      error: (err) => console.error('❌ Error getting userId:', err),
    });
  }

  GetUserBranch(userId: string) {
    if (userId) {
      this.apiService.GetUserBranch(userId).subscribe({
        next: (response) => {
          // console.log('branch : ', response);
          this.branchId = response.id;
          localStorage.setItem('br', response.id);

          if (this.branchId !== null) {
            this.branchService.setBranch(this.branchId);
          }
        },
        error: (err) => {
          // console.log(err);
        },
      });
    } else {
      // console.log(userId);
    }
  }

  changeLanguage() {
    const currentLang = localStorage.getItem('lang') || 'en';
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    this.languageService.switchLanguage(newLang);
  }

  onSelectBranch(id: number, ev: Event) {
    ev.preventDefault();
    // ev.stopPropagation();     // أهم سطرين هنا
    this.switchBranch(id); // دالتك الحالية بدون أي router.navigate
  }

  // navbar.component.ts
  get isLoggedIn(): boolean {
    return !!this.user; // أو فحص token من authService
  }

  // navbar.component.ts
  get firstName(): string {
    if (!this.user?.fullName) return '';
    return this.user.fullName.split(' ')[0]; // أول كلمة بس
  }

  openBranchSelector() {
    // هنا بننادي على ميثود في الـ BranchService تفتح المودال في الـ AppComponent
    this.branchService.openModal();

    this.api.getAllBranches().subscribe({
      next: (data) => {
        this.branches = data; // تخزين الفروع لعرضها
        // console.log(data);
        const savedBranchId = this.branchService.getCurrentBranch();
        if (!savedBranchId) {
          this.branchService.openModal(); // تظهر أول ما الصفحة تحمل لو مفيش فرع
        }
      },
    });
  }

  get isProductsRoute(): boolean {
    const path = this.router.url.split('?')[0];
    return path === '/products' || path.startsWith('/products/');
  }

  private updateHomeFlag(): void {
    const path = this.router.url.split('?')[0];
    this.isHome = path === '/' || path === '/home' || path === '';
    this.isOverlay = path === '/bubble-events';
    this.isFloating = path === '/kids-area';
  }

  /** Keep mega menu short — first 6 drink categories only. */
  get megaCategories(): any[] {
    return (this.categories || []).slice(0, 6);
  }

  get visibleRawNav(): RawCategoryLink[] {
    return this.rawNav.slice(0, RAW_NAV_LIMIT);
  }

  get moreRawNav(): RawCategoryLink[] {
    return this.rawNav.slice(RAW_NAV_LIMIT);
  }

  get isMoreActive(): boolean {
    const [path, query = ''] = this.router.url.split('?');
    const categoryId = new URLSearchParams(query).get('categoryId');
    return this.moreRawNav.some((item) =>
      item.queryParams
        ? path === item.route && String(item.queryParams['categoryId']) === categoryId
        : path === item.route
    );
  }

  rawNavName(item: RawCategoryLink): string {
    return this.categoryLabel({ name: item.name, name_ar: item.name_ar });
  }

  trackByCategoryId = (_: number, cat: any) => cat?.id ?? cat?.name;
  trackByRawNav = (_: number, item: RawCategoryLink) =>
    Number.isFinite(item.categoryId) ? item.categoryId : item.route;

  categoryLabel(cat: any): string {
    if (!cat) return '';
    const isAr =
      (this.languageService as any).translate?.currentLang === 'ar' ||
      (this.languageService as any).currentLang === 'ar' ||
      document.documentElement.dir === 'rtl';
    return isAr ? cat.name_ar || cat.name : cat.name;
  }
}
