import { Component, ElementRef, HostListener, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { BehaviorSubject, Subject, combineLatest, of } from 'rxjs';
import {
  catchError, distinctUntilChanged, filter, map,
  switchMap, takeUntil, tap
} from 'rxjs/operators';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-raw-material-products',
  templateUrl: './raw-material-products.component.html',
  styleUrls: ['./raw-material-products.component.scss']
})
export class RawMaterialProductsComponent implements OnDestroy {
  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private branchService: BranchService,
    private toastr: ToastrService,
    public languageService: LanguageService
  ) { }

  products: any[] = [];
  categories: any[] = [];
  selectedCategoryId: number | null = null;

  cartId!: number;
  userId!: string;
  branchId!: number;
  showScrollButton = false;

  @ViewChild('catRail') catRail!: ElementRef<HTMLDivElement>;

  loadState: LoadState = 'loading';

  // streams
  private destroy$ = new Subject<void>();
  private selectedCategoryId$ = new BehaviorSubject<number | null>(null);

  ngOnInit() {
    this.loadState = 'loading';

    // 1) حمّل كل التصنيفات مرة واحدة
    this.api.getAllCategories(this.api.rawMaterials).subscribe({
      next: (res) => {
        this.categories = res || [];
        // خُد الكاتيجوري من URL لو موجود، وإلا أول كاتيجوري
        const qCat = Number(this.route.snapshot.queryParamMap.get('categoryId')) || null;
        const initial = (qCat && this.categories.some(c => c.id === qCat))
          ? qCat
          : (this.categories[0]?.id ?? null);

        this.selectedCategoryId = initial;
        this.selectedCategoryId$.next(initial);

        if (initial) {
          // مزامنة URL بدون إضافة history جديدة
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { categoryId: initial },
            replaceUrl: true
          });
        }
      },
      error: () => { this.loadState = 'error'; }
    });

    // 2) فرع فعّال (مع fallback من localStorage)
    const branch$ = this.branchService.currentBranch$.pipe(
      map(b => (b != null ? b : Number(localStorage.getItem('br')))),
      filter((b): b is number => Number.isFinite(b as number)),
      distinctUntilChanged()
    );

    // 3) استمع لأي تغيير في الكاتيجوري من الـ URL (لو اتغيّر خارجيًا)
    const urlCategory$ = this.route.queryParamMap.pipe(
      map(p => Number(p.get('categoryId')) || null),
      distinctUntilChanged()
    );

    // خُد الكاتيجوري النهائي (من الـ URL أو من اختياراتك)
    const categoryId$ = combineLatest([this.selectedCategoryId$, urlCategory$]).pipe(
      map(([sel, url]) => url ?? sel),
      filter((id): id is number => id != null),
      distinctUntilChanged()
    );

    // 4) حمّل المنتجات عند أي تغيير فرع/كاتيجوري (switchMap يكانسل القديم)
    // combineLatest([branch$, categoryId$]).pipe(
    //   tap(([b, id]) => {
    //     this.branchId = b;
    //     this.selectedCategoryId = id;
    //     this.products = [];
    //     this.loadState = 'loading';
    //   }),
    //   switchMap(([b, id]) =>

    //     this.api.GetAllProductsByCategoryId(b, { categoryId: id, userId: this.userId ?? undefined }).pipe(catchError(() => of([])))

    //   ),
    //   takeUntil(this.destroy$)
    // ).subscribe(list => {
    //   // لو مفيش منتجات → products=[] وهنعرض رسالة تحت
    //   this.loadState = 'success';
    //   console.log(list);
    //   this.products = list;
    //   const token = localStorage.getItem('token');
    //   // const hasToken = !!token && token !== 'null' && token !== 'undefined' && token.trim() !== '';

    // });

    // تجهيز الكارت لو فيه توكن (اختياري)
    const token = localStorage.getItem('token');
    const hasToken = !!token && token !== 'null' && token !== 'undefined' && token.trim() !== '';
    if (hasToken) {
      this.api.GetUserId().subscribe({
        next: (r) => {
          this.userId = r.userId;
          // this.api.GetOrCreateCart(this.userId).subscribe({ next: (c) => this.cartId = c.id });
          combineLatest([branch$, categoryId$]).pipe(
            tap(([b, id]) => {
              this.branchId = b;
              this.selectedCategoryId = id;
              this.products = [];
              this.loadState = 'loading';
            }),
            switchMap(([b, id]) =>

              this.api.GetAllProductsByCategoryId(b, { categoryId: id, userId: this.userId ?? undefined }).pipe(catchError(() => of([])))

            ),
            takeUntil(this.destroy$)
          ).subscribe(list => {
            // لو مفيش منتجات → products=[] وهنعرض رسالة تحت
            this.loadState = 'success';
            console.log(list);
            this.products = list;
            const token = localStorage.getItem('token');
            // const hasToken = !!token && token !== 'null' && token !== 'undefined' && token.trim() !== '';

          });
        }
      });
    }
    else {
      combineLatest([branch$, categoryId$]).pipe(
        tap(([b, id]) => {
          this.branchId = b;
          this.selectedCategoryId = id;
          this.products = [];
          this.loadState = 'loading';
        }),
        switchMap(([b, id]) =>

          this.api.GetAllProductsByCategoryId(b, { categoryId: id, userId: this.userId ?? undefined }).pipe(catchError(() => of([])))

        ),
        takeUntil(this.destroy$)
      ).subscribe(list => {
        // لو مفيش منتجات → products=[] وهنعرض رسالة تحت
        this.loadState = 'success';
        console.log(list);
        this.products = list;
        const token = localStorage.getItem('token');
        // const hasToken = !!token && token !== 'null' && token !== 'undefined' && token.trim() !== '';

      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next(); this.destroy$.complete();
  }

  // اختيار كاتيجوري من التابس
  selectCategory(category: any) {
    if (!category?.id) return;
    this.selectedCategoryId = category.id;
    this.selectedCategoryId$.next(category.id);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoryId: category.id },
      replaceUrl: true
    });
  }

  // Scroll helpers
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    this.showScrollButton = y > 300;
  }
  scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  // تفاصيل
  gotodetails(product: any) {
    this.router.navigate(['rawmaterialdetails', product.slug]); // بدون سلاش زائد
  }

  // المفضلة و السلة زي ما هم عندك (اختصارًا)
  addToCart(data: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }


    const dataToAdded = {
      quantity: 1,
      productId: data.id,
      branchId: this.branchId,
      userId: this.userId
    };

    this.api.addToCart(dataToAdded).subscribe({
      next: (response) => {
        this.toastr.success("Great choice! It's now in your cart.");

        console.log("add to cart", response);
      },
      error: (err) => {
        this.toastr.warning(err.error.message);

        console.log(err);
      }
    });




  }

  addToFavourite(item: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const dataToAdded = {
      productId: item.id,
      userId: this.userId,
      branchId: this.branchId

    };

    this.api.addToFavourite(dataToAdded).subscribe({
      next: () => {
        this.toastr.success("Product Saved to your wishlist!");

        item.isFavorite = true;
      },
      error: (err) => {
        console.log(err)
      }
    });
  }

  removeFromFavourite(item: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }




    this.api.removeFromFavourite(item.id, this.branchId, this.userId).subscribe({
      next: () => {
        this.toastr.success("Product removed from your wishlist.");

        item.isFavorite = false;
      },
      error: (err) => console.log(err)

    })
    console.log(item);





  }

  // سلوك السحب للتابس كما هو عندك
  moved = false;
  private isPointerDown = false;
  private isDragging = false;
  private startX = 0;
  private startScrollLeft = 0;
  private lastX = 0;
  private velX = 0;
  private dragThreshold = 10;
  private momentumId: number | null = null;

  onTabsWheel(e: WheelEvent, el: HTMLElement) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollBy({ left: e.deltaY, behavior: 'auto' });
      e.preventDefault();
    }
  }
  dragStart(e: PointerEvent, el: HTMLElement) {
    this.isPointerDown = true; this.isDragging = false; this.moved = false;
    this.startX = this.lastX = e.clientX; this.startScrollLeft = el.scrollLeft; this.velX = 0;
  }
  dragMove(e: PointerEvent, el: HTMLElement) {
    if (!this.isPointerDown) return;
    const dx = e.clientX - this.startX;
    if (!this.isDragging && Math.abs(dx) > this.dragThreshold) {
      this.isDragging = true; this.moved = true; el.classList.add('dragging');
      try { el.setPointerCapture(e.pointerId); } catch { }
    }
    if (!this.isDragging) return;
    el.scrollLeft = this.startScrollLeft - dx;
    this.velX = e.clientX - this.lastX; this.lastX = e.clientX;
    e.preventDefault();
  }
  dragEnd(e: PointerEvent, el: HTMLElement) {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    try { el.releasePointerCapture?.(e.pointerId); } catch { }
    if (this.isDragging) {
      el.classList.remove('dragging');
      if (this.momentumId) cancelAnimationFrame(this.momentumId);
      let v = this.velX;
      const step = () => { if (Math.abs(v) < 0.2) return; el.scrollLeft -= v; v *= 0.95; this.momentumId = requestAnimationFrame(step); };
      this.momentumId = requestAnimationFrame(step);
    }
    this.isDragging = false;
    requestAnimationFrame(() => { this.moved = false; });
  }
}
