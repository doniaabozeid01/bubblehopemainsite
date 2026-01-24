import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { BranchService } from 'src/app/services/branch.service';
import { CartCountService } from 'src/app/services/cart-count.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  categories: any;
  branches: any;
  userId!: string;
  branchId!: number;
  user: any;
  isMenuOpen = false;

  constructor(
    private cartCountService: CartCountService,
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private branchService: BranchService,
    private toastr: ToastrService,
    public languageService: LanguageService
  ) { }
  cartCount = 0;

  ngOnInit(): void {

    this.router.events.subscribe(() => {
    this.isMenuOpen = false;
      });

    this.authService.currentUser$.subscribe((u) => {
      this.user = u;
      console.log('user', this.user);
    });
    this.cartCountService.cartCount$.subscribe((c) => (this.cartCount = c));

    const token = localStorage.getItem('token');
    if (token) {
      this.apiService.GetUserId().subscribe({
        next: (res) => {
          this.userId = typeof res === 'string' ? res : res?.userId;

          if (this.userId) {
            const initialBranchId = Number(
              this.branchService.getCurrentBranch()
            );
            if (initialBranchId) {
              this.branchId = initialBranchId;

              // ✅ بدل ما تنده getCart هنا بس… خلّيها تعمل refresh للـ count
              this.cartCountService.refresh(this.branchId, this.userId);
            }

            this.branchService.currentBranch$.subscribe((branchId) => {
              if (branchId && branchId !== this.branchId) {
                this.branchId = branchId;

                // ✅ يحدث العداد لما الفرع يتغير
                this.cartCountService.refresh(branchId, this.userId);
              }
            });
          }
        },
        error: (err) => {
          console.error('❌ Error getting userId:', err);
          this.cartCountService.setCount(0);
        },
      });
    } else {
      this.GetDefaultBranch();
      // this.selectIdFromPathIfExist()
    }

    // ✅ Listen to branch changes from BranchService (when user switches branch from Navbar)
    this.branchService.currentBranch$.subscribe((branchId) => {
      if (branchId) {
        this.branchId = branchId;
      }
    });

    this.apiService.getAllCategories(this.apiService.drinks).subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (err) => {
        console.error('Error loading categories:', err);
      },
    });

    this.apiService.getAllBranches().subscribe({
      next: (data) => {
        console.log(data);

        this.branches = data;
      },
      error: (err) => {
        console.error('Error loading branches:', err);
      },
    });
  }

  logout() {
    this.authService.logout();

    const token = localStorage.getItem('token');
    if (token) {
      localStorage.removeItem('token');
    }
  }

  switchBranch(branchId: number) {
    const token = localStorage.getItem('token');
    if (token) {
      this.apiService.GetUserId().subscribe({
        next: (res) => {
          console.log(res);
          this.userId = res.userId;

          const data = {
            userId: this.userId,
            newBranchId: branchId,
          };

          console.log(data);

          this.apiService.switchBranch(data).subscribe({
            next: (response) => {
              this.toastr.success('Branch Swiched Successfully.');

              console.log('response : ', response);
              this.branchService.setBranch(branchId);
            },
            error: (err) => {
              console.log(err);
              console.log('err : ', err);
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
  }

  GetUserBranch(userId: string) {
    if (userId) {
      this.apiService.GetUserBranch(userId).subscribe({
        next: (response) => {
          console.log('branch : ', response);
          this.branchId = response.id;
          localStorage.setItem('br', response.id);

          this.branchService.setBranch(this.branchId);
        },
        error: (err) => {
          console.log(err);
        },
      });
    } else {
      console.log(userId);
    }
  }

  GetDefaultBranch() {
    this.apiService.GetDefaultBranch().subscribe({
      next: (response) => {
        console.log('Default Branch : ', response);
        this.branchId = response.id;
        localStorage.setItem('br', response.id);
      },
      error: (err) => {
        console.log(err);
      },
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

  closeMenu() {
  this.isMenuOpen = false;
}

}
