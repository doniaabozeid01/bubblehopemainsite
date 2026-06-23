import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { SeoService } from 'src/app/services/seo.service';
import {
  BookableSession,
  KidsActivity,
  formatApiDate,
  formatDateKey,
  getActivityIcon,
  getSessionTimeLabel,
  getSessionsForActivity,
  normalizeActivitiesResponse,
  parseAvailabilitySessions,
  resolveBookingSession,
  resolveBookingDateIso,
} from 'src/app/utils/kids-workshops.util';

type KidsAreaStep = 'activity' | 'session' | 'details';

export interface ActivityZone {
  id: string;
  icon: string;
  image: string;
  imagePosition?: string;
}

export interface FloatingBubble {
  id: number;
  size: number;
  x: number;
  delay: number;
  duration: number;
  opacity: number;
  variant: 0 | 1 | 2;
  drift: number;
}

const KIDS_IMG = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}?w=900&h=700&fit=crop&auto=format&q=80`;

@Component({
  selector: 'app-kids-area',
  templateUrl: './kids-area.component.html',
  styleUrls: ['./kids-area.component.scss'],
})
export class KidsAreaComponent implements OnInit, OnDestroy {
  private static readonly SCROLL_CLASS = 'kids-area-scroll';

  loading = false;
  loadingActivities = true;
  submitted = false;
  invoiceId = '';
  showBirthdayCelebration = false;
  showScrollButton = false;

  readonly floatingBubbles: FloatingBubble[] = [
    { id: 0, size: 48, x: 6, delay: 0, duration: 11, opacity: 0.32, variant: 0, drift: 28 },
    { id: 1, size: 62, x: 18, delay: 1.4, duration: 14, opacity: 0.38, variant: 1, drift: -24 },
    { id: 2, size: 38, x: 32, delay: 0.6, duration: 9, opacity: 0.28, variant: 2, drift: 22 },
    { id: 3, size: 54, x: 48, delay: 2.1, duration: 12, opacity: 0.34, variant: 0, drift: -30 },
    { id: 4, size: 44, x: 62, delay: 0.9, duration: 10, opacity: 0.3, variant: 1, drift: 26 },
    { id: 5, size: 68, x: 74, delay: 3.2, duration: 15, opacity: 0.42, variant: 2, drift: -20 },
    { id: 6, size: 40, x: 88, delay: 1.8, duration: 8, opacity: 0.26, variant: 0, drift: 18 },
    { id: 7, size: 56, x: 12, delay: 4.5, duration: 13, opacity: 0.36, variant: 2, drift: -28 },
    { id: 8, size: 46, x: 42, delay: 2.8, duration: 11, opacity: 0.33, variant: 1, drift: 24 },
    { id: 9, size: 60, x: 56, delay: 0.3, duration: 14, opacity: 0.4, variant: 0, drift: -22 },
    { id: 10, size: 36, x: 28, delay: 5.1, duration: 9, opacity: 0.27, variant: 2, drift: 30 },
    { id: 11, size: 50, x: 80, delay: 1.2, duration: 12, opacity: 0.35, variant: 1, drift: -26 },
    { id: 12, size: 58, x: 36, delay: 3.8, duration: 10, opacity: 0.37, variant: 0, drift: 20 },
    { id: 13, size: 42, x: 68, delay: 2.4, duration: 11, opacity: 0.31, variant: 2, drift: -18 },
  ];

  currentStep: KidsAreaStep = 'activity';
  branchId = 0;
  activities: KidsActivity[] = [];
  allSessions: BookableSession[] = [];
  visibleSessions: BookableSession[] = [];
  selectedActivityId: number | null = null;
  selectedSessionKey: string | null = null;

  ageOptions = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  readonly activityZones: ActivityZone[] = [
    {
      id: 'play',
      icon: 'bi-balloon-heart',
      image: KIDS_IMG('1759330203240-b89ccee8840f'),
      imagePosition: 'center 42%',
    },
    {
      id: 'draw',
      icon: 'bi-palette',
      image: KIDS_IMG('1703301287703-159acad046d0'),
      imagePosition: 'center 40%',
    },
    {
      id: 'lego',
      icon: 'bi-bricks',
      image: KIDS_IMG('1655842556550-6809c404ce9c'),
      imagePosition: 'center 48%',
    },
    {
      id: 'reading',
      icon: 'bi-book',
      image: KIDS_IMG('1540151812223-c30b3fab58e6'),
      imagePosition: 'center 40%',
    },
  ];

  readonly parentsMenuItems = [
    { icon: 'bi-cup-straw', titleKey: 'kidsArea.page.parents.menu1Title', subKey: 'kidsArea.page.parents.menu1Sub' },
    { icon: 'bi-cake2', titleKey: 'kidsArea.page.parents.menu2Title', subKey: 'kidsArea.page.parents.menu2Sub' },
    { icon: 'bi-grid-3x3-gap', titleKey: 'kidsArea.page.parents.menu3Title', subKey: 'kidsArea.page.parents.menu3Sub' },
    { icon: 'bi-snow2', titleKey: 'kidsArea.page.parents.menu4Title', subKey: 'kidsArea.page.parents.menu4Sub' },
  ];

  readonly parentsPerks = [
    { icon: 'bi-house-heart', titleKey: 'kidsArea.page.parents.perk1Title', textKey: 'kidsArea.page.parents.perk1Text' },
    { icon: 'bi-music-note-beamed', titleKey: 'kidsArea.page.parents.perk3Title', textKey: 'kidsArea.page.parents.perk3Text' },
    { icon: 'bi-eye', titleKey: 'kidsArea.page.parents.perk4Title', textKey: 'kidsArea.page.parents.perk4Text' },
    { icon: 'bi-puzzle', titleKey: 'kidsArea.page.parents.perk5Title', textKey: 'kidsArea.page.parents.perk5Text' },
  ];

  form = this.fb.group({
    parentName: ['', Validators.required],
    phone: ['', [Validators.required, Validators.minLength(10)]],
    childAge: ['', Validators.required],
    childName: ['', Validators.required],
    birthDate: ['', Validators.required],
  });

  private branchSub?: Subscription;
  private langSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private router: Router,
    private branchService: BranchService,
    private seoService: SeoService
  ) {}

  ngOnInit(): void {
    document.documentElement.classList.add(KidsAreaComponent.SCROLL_CLASS);
    this.updateSeo();
    this.langSub = this.translate.onLangChange.subscribe(() => this.updateSeo());

    this.branchId = this.branchService.getCurrentBranch() ?? 0;
    if (!this.branchId) {
      this.toastr.error(this.translate.instant('kidsArea.branchRequired'));
    } else {
      this.loadAvailability();
    }

    this.branchSub = this.branchService.currentBranch$.subscribe((id) => {
      if (!id || id === this.branchId) return;
      this.branchId = id;
      this.loadAvailability();
    });

    this.form.get('birthDate')?.valueChanges.subscribe((value) => {
      this.showBirthdayCelebration = this.isBirthdayToday(value || '');
    });
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove(KidsAreaComponent.SCROLL_CLASS);
    this.branchSub?.unsubscribe();
    this.langSub?.unsubscribe();
  }

  private updateSeo(): void {
    this.seoService.updateTitleAndDescription(
      this.translate.instant('kidsArea.page.seoTitle'),
      this.translate.instant('kidsArea.page.seoDescription')
    );
  }

  private get todayBookingDate(): string {
    return formatDateKey(new Date());
  }

  private getCurrentTimeParam(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getTodayLabel(): string {
    const locale = this.isArabic() ? 'ar-EG' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }

  loadAvailability(): void {
    if (!this.branchId) return;

    this.loadingActivities = true;
    this.selectedActivityId = null;
    this.selectedSessionKey = null;
    this.visibleSessions = [];
    this.currentStep = 'activity';

    const bookingDate = this.todayBookingDate;
    const date = formatApiDate(bookingDate);
    this.api
      .getKidsAreaAvailability(date, this.branchId, this.getCurrentTimeParam())
      .subscribe({
        next: (response) => {
          this.activities = normalizeActivitiesResponse(response);
          this.allSessions = parseAvailabilitySessions(
            bookingDate,
            response,
            this.activities
          );
          this.loadingActivities = false;
        },
        error: (err) => {
          this.loadingActivities = false;
          this.activities = [];
          this.allSessions = [];
          console.error('Kids Area availability failed:', err?.error || err);
          this.toastr.error(this.translate.instant('kidsArea.error'));
        },
      });
  }

  selectActivity(activity: KidsActivity): void {
    this.selectedActivityId = activity.id;
    this.selectedSessionKey = null;
    this.visibleSessions = getSessionsForActivity(this.allSessions, activity.id);
    this.currentStep = 'session';
  }

  selectSession(session: BookableSession): void {
    if (session.isFull) return;

    this.selectedSessionKey = session.sessionKey;
    this.currentStep = 'details';
  }

  getSelectedActivity(): KidsActivity | null {
    if (!this.selectedActivityId) return null;
    return this.activities.find((a) => a.id === this.selectedActivityId) ?? null;
  }

  getSelectedSession(): BookableSession | null {
    if (!this.selectedSessionKey) return null;
    return (
      this.allSessions.find((s) => s.sessionKey === this.selectedSessionKey) ??
      null
    );
  }

  isArabic(): boolean {
    return (this.translate.currentLang || 'en') === 'ar';
  }

  getActivityName(activity: KidsActivity): string {
    return this.isArabic() ? activity.nameAr : activity.nameEn;
  }

  getActivityDescription(activity: KidsActivity): string {
    return this.isArabic() ? activity.descriptionAr : activity.descriptionEn;
  }

  getSessionDayLabel(session: BookableSession): string {
    const date = new Date(`${session.date}T00:00:00`);
    const locale = this.isArabic() ? 'ar-EG' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  getSessionTimeLabel(session: BookableSession): string {
    return getSessionTimeLabel(session, this.isArabic());
  }

  getSpotsLabel(session: BookableSession): string {
    if (session.isFull) {
      return this.translate.instant('kidsArea.sessionClosed');
    }
    if (!session.hasCapacityLimit) {
      return this.translate.instant('kidsArea.sessionOpen');
    }
    return this.translate.instant('kidsArea.spotsLeft', {
      count: session.spotsLeft ?? 0,
    });
  }

  stepIndex(step: KidsAreaStep): number {
    return { activity: 0, session: 1, details: 2 }[step];
  }

  isStepDone(step: KidsAreaStep): boolean {
    return this.stepIndex(step) < this.stepIndex(this.currentStep);
  }

  isStepActive(step: KidsAreaStep): boolean {
    return this.currentStep === step;
  }

  goToStep(step: KidsAreaStep): void {
    if (step === 'activity') {
      this.currentStep = 'activity';
      return;
    }
    if (step === 'session' && this.selectedActivityId) {
      this.currentStep = 'session';
      return;
    }
    if (step === 'details' && this.selectedSessionKey) {
      this.currentStep = 'details';
    }
  }

  stepBack(): void {
    if (this.currentStep === 'details') {
      this.currentStep = 'session';
      return;
    }
    if (this.currentStep === 'session') {
      this.currentStep = 'activity';
      this.selectedActivityId = null;
      this.selectedSessionKey = null;
      this.visibleSessions = [];
    }
  }

  private isBirthdayToday(dateValue: string): boolean {
    if (!dateValue) return false;
    const d = new Date(
      dateValue.includes('T') ? dateValue : `${dateValue}T00:00:00`
    );
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    return (
      d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
    );
  }

  get celebrationChildName(): string {
    return this.form.get('childName')?.value?.trim() || '';
  }

  getActivityIcon(name: string): string {
    return getActivityIcon(name);
  }

  private extractPaymentOrInvoiceUrl(response: any): string | null {
    const direct =
      response?.paymentUrl ||
      response?.invoiceUrl ||
      response?.redirectUrl ||
      response?.iframeUrl;

    const nested =
      response?.data?.paymentUrl ||
      response?.data?.invoiceUrl ||
      response?.data?.redirectUrl ||
      response?.data?.iframeUrl;

    return direct || nested || null;
  }

  private extractInvoiceId(response: any): string {
    const direct =
      response?.id ||
      response?.invoiceId ||
      response?.invoiceNumber ||
      response?.orderId ||
      response?.bookingId;
    const nested =
      response?.data?.id ||
      response?.data?.invoiceId ||
      response?.data?.invoiceNumber ||
      response?.data?.orderId ||
      response?.data?.bookingId;
    const value = direct || nested;
    return value ? String(value) : '';
  }

  private toIsoBirthday(dateValue: string): string {
    if (!dateValue) return '';
    const d = new Date(`${dateValue}T00:00:00`);
    return isNaN(d.getTime()) ? dateValue : d.toISOString();
  }

  private extractApiMessage(err: any): string {
    const validationErrors = err?.error?.errors || null;
    const firstValidationMessage = validationErrors
      ? Object.entries(validationErrors)
          .flatMap(([, value]) => (Array.isArray(value) ? value : []))
          .find((msg) => typeof msg === 'string')
      : null;

    if (firstValidationMessage) return firstValidationMessage;

    const body = err?.error;
    if (this.isArabic()) {
      return body?.messageAr || body?.message || body?.title || '';
    }
    return body?.message || body?.messageAr || body?.title || '';
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const preferred = this.getSelectedSession();
    if (!preferred) {
      this.toastr.error(this.translate.instant('kidsArea.workshopRequired'));
      this.currentStep = 'session';
      return;
    }

    const { session, wasReassigned } = resolveBookingSession(
      preferred,
      this.allSessions
    );

    if (!session) {
      this.toastr.error(this.translate.instant('kidsArea.allSessionsFull'));
      this.loadAvailability();
      return;
    }

    if (wasReassigned) {
      this.toastr.info(this.translate.instant('kidsArea.sessionReassigned'));
      this.selectedSessionKey = session.sessionKey;
    }

    this.loading = true;
    const v = this.form.getRawValue();
    const payload = {
      activityId: session.activityId,
      slotId: session.slotId,
      bookingDate: resolveBookingDateIso(session),
      parentName: (v.parentName || '').trim(),
      parentNumber: (v.phone || '').trim(),
      childName: (v.childName || '').trim(),
      childOld: Number(v.childAge),
      childBirthday: this.toIsoBirthday(v.birthDate || ''),
    };

    this.api
      .submitKidsAreaActivityBooking(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.submitted = true;
          this.invoiceId = this.extractInvoiceId(res);
          this.toastr.success(this.translate.instant('kidsArea.success'));
          this.showBirthdayCelebration = false;
          this.form.reset();
          this.selectedActivityId = null;
          this.selectedSessionKey = null;
          this.currentStep = 'activity';
          this.loadAvailability();

          const paymentUrl = this.extractPaymentOrInvoiceUrl(res);
          if (paymentUrl) {
            window.location.href = paymentUrl;
          }
        },
        error: (err) => {
          const apiMessage =
            this.extractApiMessage(err) ||
            this.translate.instant('kidsArea.error');

          if (err?.status === 409 || /full|ممتلئ|capacity/i.test(apiMessage)) {
            this.toastr.error(this.translate.instant('kidsArea.allSessionsFull'));
            this.loadAvailability();
            return;
          }

          if (/ended|انته|slot has already/i.test(apiMessage)) {
            this.toastr.error(this.translate.instant('kidsArea.sessionEnded'));
            this.loadAvailability();
            return;
          }

          console.error('Kids Area booking failed:', err?.error || err);
          this.toastr.error(apiMessage);
        },
      });
  }

  back(): void {
    if (this.currentStep !== 'activity') {
      this.stepBack();
      return;
    }
    this.router.navigateByUrl('/products');
  }

  selectChildAge(age: string): void {
    this.form.get('childAge')?.setValue(age);
    this.form.get('childAge')?.markAsTouched();
  }

  onActivityImageError(event: Event, zoneId: string): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallbackApplied']) return;
    img.dataset['fallbackApplied'] = 'true';
    img.src = zoneId === 'play' ? '/assets/kidsarea-bg.jpg' : '/assets/kids-toys.png';
  }

  scrollToForm(): void {
    document.getElementById('kids-register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    this.showScrollButton = scrollPosition > 300;
  }
}
