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
  /** Force-hide Products mega after a click until the mouse leaves */
  megaClosed = false;

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
    public api: ApiService
  ) {}

  ngOnInit(): void {
    this.scrolled = window.scrollY > 24;
    this.updateHomeFlag();

    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updateHomeFlag();
        this.closeMenu();
        this.closeMega();
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
            const initialBranchId = Number(this.branchService.getCurrentBranch());
            if (initialBranchId) {
              this.branchId = initialBranchId;
              this.cartCountService.refresh(this.branchId, this.userId);
              this.wishlistCountService.refresh(this.branchId, this.userId);
            }

            this.branchService.currentBranch$.subscribe((branchId) => {
              if (branchId && branchId !== this.branchId) {
                this.branchId = branchId;
                this.cartCountService.refresh(branchId, this.userId);
                this.wishlistCountService.refresh(branchId, this.userId);
              }
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
      this.GetDefaultBranch();
      this.wishlistCountService.clear();
    }

    this.branchService.currentBranch$.subscribe((branchId) => {
      if (branchId) {
        this.branchId = branchId;
      }
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
        this.branches = data;
      },
      error: (err) => {
        console.error('Error loading branches:', err);
      },
    });

    this.branchService.currentBranch$.subscribe((id) => {
      if (id) {
        this.branchId = id;
        this.updateBranchName(id);
      }
    });

    this.apiService.getAllBranches().subscribe({
      next: (data) => {
        this.branches = data;
        const currentId = this.branchService.getCurrentBranch();
        if (currentId) {
          this.updateBranchName(Number(currentId));
        }
      },
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
          (this.languageService as any).translate?.currentLang === 'ar' ||
          (this.languageService as any).currentLang === 'ar';

        this.selectedBranchName = isAr ? branch.name_ar : branch.name;
      }
    }
  }

  logout() {
    this.authService.logout();
    this.cartCountService.setCount(0);
    this.wishlistCountService.clear();
    this.router.navigate(['/home']);
  }

  switchBranch(branchId: number) {
    const token = localStorage.getItem('token');
    if (token) {
      this.apiService.GetUserId().subscribe({
        next: (res) => {
          // console.log(res);
          this.userId = res.userId;

          const data = {
            userId: this.userId,
            newBranchId: branchId,
          };

          // console.log(data);

          this.apiService.switchBranch(data).subscribe({
            next: (response) => {
              this.toastr.success('Branch Swiched Successfully.');

              // console.log('response : ', response);
              this.branchService.setBranch(branchId);
            },
            error: (err) => {
              // console.log(err);
              // console.log('err : ', err);
              this.toastr.success(err.error.message);
            },
          });
        },
        error: (err) => console.error('❌ Error getting userId:', err),
      });
    } else {
      localStorage.setItem('br', branchId.toString());
      this.branchService.setBranch(branchId); // 👈 ضيف دي      // this.router.navigate(['/auth/login'])
    }

    this.branchService.setBranch(branchId);
    this.updateBranchName(branchId);
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

  GetDefaultBranch() {
    // Don't overwrite a user-selected branch; only fill in when missing/invalid.
    const current = this.branchService.getCurrentBranch();
    if (current) return;

    this.apiService.GetDefaultBranch().subscribe({
      next: (response) => {
        const id = Number(response?.id);
        if (!id) return;
        this.branchId = id;
        this.branchService.setBranch(id);
      },
      error: () => {},
    });
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
  }

  /** Keep mega menu short — first 6 drink categories only. */
  get megaCategories(): any[] {
    return (this.categories || []).slice(0, 6);
  }

  trackByCategoryId = (_: number, cat: any) => cat?.id ?? cat?.name;

  categoryLabel(cat: any): string {
    if (!cat) return '';
    const isAr =
      (this.languageService as any).translate?.currentLang === 'ar' ||
      (this.languageService as any).currentLang === 'ar' ||
      document.documentElement.dir === 'rtl';
    return isAr ? cat.name_ar || cat.name : cat.name;
  }
}
