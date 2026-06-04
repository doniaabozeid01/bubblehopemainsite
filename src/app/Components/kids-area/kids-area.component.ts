import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { LanguageService } from 'src/app/services/language.service';
import { ApiService } from 'src/app/services/api.service';
import { SeoService } from 'src/app/services/seo.service';

export interface ActivityZone {
  id: string;
  icon: string;
  image: string;
  imagePosition?: string;
}

/** Unsplash crop — indoor kids play / games (replace with /assets/… when you have venue photos). */
const KIDS_IMG = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}?w=900&h=700&fit=crop&auto=format&q=80`;

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

@Component({
  selector: 'app-kids-area',
  templateUrl: './kids-area.component.html',
  styleUrls: ['./kids-area.component.scss']
})
export class KidsAreaComponent implements OnInit, OnDestroy {
  private static readonly SCROLL_CLASS = 'kids-area-scroll';

  showScrollButton = false;
  ageMenuOpen = false;
  submittingRegistration = false;
  private langSub?: Subscription;

  /** Boba-style bubbles falling over the hero image (fixed layout, no re-roll on change detection). */
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

  ages = Array.from({ length: 10 }, (_, i) => i + 3); // 3..12

  /** Latest allowed DOB (today) for the date picker. */
  readonly maxBirthDate = new Date().toISOString().slice(0, 10);

  registration = {
    parentName: '',
    phone: '',
    childName: '',
    childAge: '',
    birthDate: ''
  };

  constructor(
    private api: ApiService,
    private seoService: SeoService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    document.documentElement.classList.add(KidsAreaComponent.SCROLL_CLASS);
    this.updateSeo();
    this.langSub = this.translate.onLangChange.subscribe(() => this.updateSeo());
  }

  ngOnDestroy() {
    document.documentElement.classList.remove(KidsAreaComponent.SCROLL_CLASS);
    this.langSub?.unsubscribe();
  }

  private updateSeo(): void {
    this.seoService.updateTitleAndDescription(
      this.translate.instant('kidsArea.page.seoTitle'),
      this.translate.instant('kidsArea.page.seoDescription')
    );
  }

  toggleAgeMenu(event: Event): void {
    event.stopPropagation();
    this.ageMenuOpen = !this.ageMenuOpen;
  }

  selectAge(age: number, event: Event): void {
    event.stopPropagation();
    this.registration.childAge = String(age);
    this.ageMenuOpen = false;
  }

  openBirthDatePicker(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const input = document.getElementById('childBirthDate') as HTMLInputElement | null;
    if (!input) {
      return;
    }
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        /* showPicker may throw if not from a user gesture */
      }
    }
    input.focus();
    input.click();
  }

  @HostListener('document:click')
  closeAgeMenu(): void {
    this.ageMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.ageMenuOpen = false;
  }

  submitRegistration(): void {
    if (this.submittingRegistration) {
      return;
    }

    if (
      !this.registration.parentName?.trim() ||
      !this.registration.phone?.trim() ||
      !this.registration.childName?.trim() ||
      !this.registration.childAge ||
      !this.registration.birthDate
    ) {
      this.toastr.error(this.translate.instant('kidsArea.page.toast.errorRequired'));
      return;
    }

    const payload = {
      parentName: this.registration.parentName.trim(),
      parentNumber: this.registration.phone.trim(),
      childName: this.registration.childName.trim(),
      childOld: Number(this.registration.childAge),
      childBirthday: this.toApiBirthday(this.registration.birthDate),
    };

    this.submittingRegistration = true;

    this.api.createKidsAreaBooking(payload).subscribe({
      next: () => {
        this.submittingRegistration = false;
        this.toastr.success(
          this.translate.instant('kidsArea.page.toast.success', {
            name: payload.parentName,
          })
        );
        this.resetRegistrationForm();
      },
      error: (err) => {
        this.submittingRegistration = false;
        const msg =
          err?.error?.message ||
          err?.error?.title ||
          this.translate.instant('kidsArea.page.toast.errorSubmit');
        this.toastr.error(msg);
      },
    });
  }

  private toApiBirthday(dateStr: string): string {
    return new Date(`${dateStr}T12:00:00`).toISOString();
  }

  private resetRegistrationForm(): void {
    this.ageMenuOpen = false;
    this.registration = {
      parentName: '',
      phone: '',
      childName: '',
      childAge: '',
      birthDate: '',
    };
  }

  onActivityImageError(event: Event, zoneId: string) {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallbackApplied']) {
      return;
    }
    img.dataset['fallbackApplied'] = 'true';
    img.src = zoneId === 'play' ? '/assets/kidsarea-bg.jpg' : '/assets/kids-toys.png';
  }

  scrollToForm() {
    document.getElementById('kids-register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.showScrollButton = scrollPosition > 300;
  }
}
