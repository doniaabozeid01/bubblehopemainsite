import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';
import { LAUNCH_CAMPAIGN } from './launch-campaign.config';

interface CountdownPart {
  key: string;
  value: string;
}

/** Cards visible behind the top photo of the deck. */
const DECK_DEPTH = 3;

@Component({
  selector: 'app-launch-campaign',
  templateUrl: './launch-campaign.component.html',
  styleUrls: ['./launch-campaign.component.scss'],
})
export class LaunchCampaignComponent implements OnInit, OnDestroy {
  readonly config = LAUNCH_CAMPAIGN;
  readonly launchTime = Date.parse(LAUNCH_CAMPAIGN.launchAt);
  readonly hideTime = LAUNCH_CAMPAIGN.hideAt ? Date.parse(LAUNCH_CAMPAIGN.hideAt) : Infinity;
  readonly videoSrc = pickVideoSource();
  readonly photos = LAUNCH_CAMPAIGN.gallery;

  visible = false;
  live = false;
  countdown: CountdownPart[] = [];
  topPhoto = 0;
  inView = false;
  ordering = false;

  @ViewChild('video') private videoRef?: ElementRef<HTMLVideoElement>;

  private countdownTimer?: ReturnType<typeof setInterval>;
  private deckTimer?: ReturnType<typeof setTimeout>;
  private observer?: IntersectionObserver;
  private reduceMotion = false;
  private readonly onVisibility = () => this.ngZone.runOutsideAngular(() => this.syncMotion());

  @ViewChild('panel') set panelEl(ref: ElementRef<HTMLElement> | undefined) {
    this.observer?.disconnect();
    if (!ref || typeof IntersectionObserver === 'undefined') return;
    this.ngZone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting === this.inView) return;
          this.inView = entry.isIntersecting;
          this.syncMotion();
          this.cdr.detectChanges();
        },
        { threshold: 0.2 }
      );
      this.observer.observe(ref.nativeElement);
    });
  }

  constructor(
    public languageService: LanguageService,
    private branchService: BranchService,
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.reduceMotion =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.addEventListener('visibilitychange', this.onVisibility);

    this.tick();
    if (!this.visible || this.live) return;
    this.ngZone.runOutsideAngular(() => {
      this.countdownTimer = setInterval(() => {
        this.tick();
        this.cdr.detectChanges();
        if (this.live || !this.visible) this.stopCountdown();
      }, 1000);
    });
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.clearDeckTimer();
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.videoRef?.nativeElement.pause();
  }

  get isArabic(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  get bgWordKey(): string {
    return this.live ? 'launchCampaign.bgWordLive' : 'launchCampaign.bgWord';
  }

  get isZewailSelected(): boolean {
    return Number(this.branchService.getCurrentBranch()) === this.config.branchId;
  }

  get running(): boolean {
    return this.inView && !this.reduceMotion;
  }

  /** Position of a photo in the deck: 0 is on top, the last one is flying away. */
  deckClass(i: number): string {
    const n = this.photos.length;
    const p = (i - this.topPhoto + n) % n;
    if (p < DECK_DEPTH) return `is-p${p}`;
    return p === n - 1 && n > DECK_DEPTH ? 'is-leaving' : 'is-hidden';
  }

  nextPhoto(): void {
    if (this.photos.length < 2) return;
    this.topPhoto = (this.topPhoto + 1) % this.photos.length;
    this.scheduleDeck();
    this.cdr.detectChanges();
  }

  orderNow(): void {
    if (this.ordering) return;
    const target = this.config.productName
      ? ['/productdetails', this.config.productName]
      : ['/products'];

    if (this.isZewailSelected) {
      this.router.navigate(target);
      return;
    }

    this.ordering = true;
    this.branchService.setBranch(this.config.branchId);

    const token = localStorage.getItem('token');
    if (!token) {
      this.ordering = false;
      this.router.navigate(target);
      return;
    }

    this.api.GetUserId().subscribe({
      next: (res) => {
        const userId = typeof res === 'string' ? res : res?.userId;
        if (!userId) {
          this.ordering = false;
          this.router.navigate(target);
          return;
        }
        this.api.switchBranch({ userId, newBranchId: this.config.branchId }).subscribe({
          next: () => {
            this.ordering = false;
            this.router.navigate(target);
          },
          error: (err) => {
            this.ordering = false;
            this.toastr.error(err?.error?.message || 'Failed to switch branch on server.');
          },
        });
      },
      error: () => {
        this.ordering = false;
        this.router.navigate(target);
      },
    });
  }

  /** Video and deck only run while the panel is on screen and the tab is visible. */
  private syncMotion(): void {
    const active = this.running && !document.hidden;
    const video = this.videoRef?.nativeElement;
    if (video) {
      if (active) video.play().catch(() => {});
      else video.pause();
    }
    if (active) this.scheduleDeck();
    else this.clearDeckTimer();
  }

  private scheduleDeck(): void {
    this.clearDeckTimer();
    if (this.photos.length < 2 || !this.running || document.hidden) return;
    this.ngZone.runOutsideAngular(() => {
      this.deckTimer = setTimeout(() => this.nextPhoto(), this.config.photoMs);
    });
  }

  private clearDeckTimer(): void {
    if (this.deckTimer) clearTimeout(this.deckTimer);
    this.deckTimer = undefined;
  }

  private tick(): void {
    const now = Date.now();
    this.visible = this.config.enabled && now < this.hideTime;
    this.live = now >= this.launchTime;
    if (this.live) {
      this.countdown = [];
      return;
    }

    const total = Math.max(0, Math.floor((this.launchTime - now) / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    this.countdown = [
      { key: 'days', value: pad(Math.floor(total / 86400)) },
      { key: 'hours', value: pad(Math.floor((total % 86400) / 3600)) },
      { key: 'minutes', value: pad(Math.floor((total % 3600) / 60)) },
      { key: 'seconds', value: pad(total % 60) },
    ];
  }

  private stopCountdown(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = undefined;
  }
}

function pickVideoSource(): string {
  const v = LAUNCH_CAMPAIGN.video;
  if (!v) return '';
  const probe = typeof document !== 'undefined' ? document.createElement('video') : null;
  const webm = probe?.canPlayType('video/webm; codecs="vp9"') ?? '';
  return webm && v.webm ? v.webm : v.mp4 || v.webm;
}
