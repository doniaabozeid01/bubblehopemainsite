import { Component ,OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LoadingService } from './services/loading.service';
import { BranchService } from './services/branch.service';
import { Observable } from 'rxjs';
import { ApiService } from './services/api.service';
import { ToastrService } from 'ngx-toastr';
import { SessionService } from './services/session.service';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
// export class AppComponent implements OnInit {
//   title = 'mainbubblehope';
//   isLoading$: Observable<boolean>;
//   isSiteEnabled: boolean | null = null;
//   showBranchModal: boolean = false;
//   branches: any[] = [];

// constructor (public translate: TranslateService,loading: LoadingService,
//     private api: ApiService,
//     private branchService: BranchService // حقن السيرفيس هنا
//   ) {
//     translate.setDefaultLang('en');
//     this.isLoading$ = loading.isLoading$;
//   }

//     checkSiteStatus() {
//     this.api.IsSiteOn().subscribe({
//       next: (res) => this.isSiteEnabled = res,
//       error: () => this.isSiteEnabled = false // fail-safe
//     });
//   }

//   // ngOnInit() {
//   //   // 2. التعديل الجديد: التأكد من وجود الفرع عند الفتح
//   //   const savedBranch = localStorage.getItem('userBranch');
//   //   if (!savedBranch) {
//   //     this.showBranchModal = true;
//   //   }
//   // }

// ngOnInit() {
//   // شيلنا الـ if مؤقتاً عشان تظهرلك في كل مرة تعمل فيها Refresh للسايت
//   this.showBranchModal = true;

//   this.checkSiteStatus();
// }

// loadBranchesAndCheckSelection() {
//     // جلب الفروع الحقيقية
//     this.api.getAllBranches().subscribe({
//       next: (data) => {
//         this.branches = data;

//         // لو مفيش فرع محفوظ، اظهر المودال
//         const currentBranch = this.branchService.getCurrentBranch();
//         if (!currentBranch) {
//           this.showBranchModal = true;
//         }
//       },
//       error: (err) => console.error('Error loading branches:', err)
//     });
//   }

// selectBranch(branchId: number) {

//     this.branchService.setBranch(branchId);
//     this.showBranchModal = false;
//   }











// }



export class AppComponent implements OnInit {
  title = 'mainbubblehope';
  isLoading$: Observable<boolean>;
  isSiteEnabled: boolean | null = null;
  showBranchModal: boolean = false;
  branches: any[] = [];

  constructor(
    public translate: TranslateService,
    private loadingService: LoadingService,
    private api: ApiService,
    private branchService: BranchService,
    private toastr: ToastrService,
    private session: SessionService,
    private router: Router
  ) {
    translate.setDefaultLang('en');
    this.isLoading$ = loadingService.isLoading$;
  }

  // ---- Every page opens at its top ----
  private lastPath: string | null = null;
  private backOrForward = false;

  private watchScroll(): void {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        this.backOrForward = e.navigationTrigger === 'popstate';
      } else if (e instanceof NavigationEnd) {
        const path = e.urlAfterRedirects.split('?')[0].split('#')[0];
        const isNewPage = this.lastPath !== null && path !== this.lastPath;
        this.lastPath = path;

        // New page via a link/button: start at the top. Back/forward keeps the browser's own
        // position, a #fragment link keeps its target, and same-page query changes stay put.
        if (isNewPage && !this.backOrForward && !e.urlAfterRedirects.includes('#')) {
          this.scrollToTop();
        }
      }
    });
  }

  private scrollToTop(): void {
    const jump = () =>
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    jump();
    // Pages grow after they render (data, images, animations); keep it at the top meanwhile.
    requestAnimationFrame(jump);
    setTimeout(jump, 120);
  }

ngOnInit() {
  this.watchScroll();

  // Signs the customer out (and asks for a new login) as soon as the token expires.
  this.session.watch();

  this.api.getAllBranches().subscribe({
    next: (data) => {
      const list = Array.isArray(data) ? data : data?.data || data?.result || [];
      this.branches = Array.isArray(list) ? list : [];
      const savedBranchId = this.branchService.getCurrentBranch();
      const isValid =
        !!savedBranchId &&
        this.branches.some((b: any) => Number(b?.id) === Number(savedBranchId));

      if (!this.branches.length) return;

      // First visit: customer picks the nearest branch. Later visits keep that choice.
      if (isValid && this.branchService.hasChosenBranch()) return;

      this.branchService.openModal();
    },
    error: () => {
      this.branches = [];
    },
  });

  this.branchService.showModal$.subscribe((isOpen) => {
    this.showBranchModal = isOpen;
    if (isOpen && !this.branches.length) this.reloadBranches();
  });

  this.checkSiteStatus();

  // Never block the app if a request counter gets stuck (e.g. dev HMR)
  setTimeout(() => this.loadingService.hideNow(), 8000);
}

  // 4. إرسال الـ ID الصحيح عند الضغط على الفرع
  selectBranch(branchId: number) {
    const token = localStorage.getItem('token');

    // Always update locally so UI reacts instantly
    this.branchService.setBranch(branchId);
    this.showBranchModal = false;

    // If logged in, also sync selection to backend
    if (!token) return;

    this.api.GetUserId().subscribe({
      next: (res) => {
        const userId = typeof res === 'string' ? res : res?.userId;
        if (!userId) return;

        this.api.switchBranch({ userId, newBranchId: branchId }).subscribe({
          next: () => {
            // keep silent or show success (optional)
          },
          error: (err) => {
            const msg = err?.error?.message || 'Failed to switch branch on server.';
            this.toastr.error(msg);
          },
        });
      },
      error: () => {
        this.toastr.error('Failed to identify user for branch switch.');
      },
    });
  }

  /** The first load can fail (e.g. rate limit); an open picker with no branches tries again. */
  private reloadBranches() {
    this.api.getAllBranches().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : data?.data || data?.result || [];
        this.branches = Array.isArray(list) ? list : [];
      },
      error: () => {},
    });
  }

  closeBranchModal() {
    // First visit must end with a real choice; later opens can be dismissed.
    if (!this.branchService.hasChosenBranch()) return;
    this.branchService.closeModal();
    this.showBranchModal = false;
  }

  isCurrentBranch(branchId: number): boolean {
    return Number(this.branchService.getCurrentBranch()) === Number(branchId);
  }

  checkSiteStatus() {
    this.api.IsSiteOn().subscribe({
      next: (res) => this.isSiteEnabled = res,
      error: () => this.isSiteEnabled = false
    });
  }
}
