import { Component ,OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LoadingService } from './services/loading.service';
import { BranchService } from './services/branch.service';
import { Observable } from 'rxjs';
import { ApiService } from './services/api.service';
import { ToastrService } from 'ngx-toastr';

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
    private toastr: ToastrService
  ) {
    translate.setDefaultLang('en');
    this.isLoading$ = loadingService.isLoading$;
  }

ngOnInit() {
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
