import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { LanguageService } from '../../../services/language.service';

export interface MaterialPillar {
  num: string;
  image: string;
  titleKey: string;
  descKey: string;
}

@Component({
  selector: 'app-materials-section',
  templateUrl: './materials-section.component.html',
  styleUrls: ['./materials-section.component.scss'],
})
export class MaterialsSectionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('sectionRef', { static: true }) sectionRef!: ElementRef<HTMLElement>;

  progress = 0;
  isDesktop = false;
  stickyStyles: Record<string, string> = {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    width: '100%',
  };

  readonly pillars: MaterialPillar[] = [
    {
      num: '01',
      image: '../../../../assets/image carousel/coconut.png',
      titleKey: 'materials.pillars.coconut.title',
      descKey: 'materials.pillars.coconut.desc',
    },
    {
      num: '02',
      image: '../../../../assets/image carousel/kiwi.png',
      titleKey: 'materials.pillars.kiwi.title',
      descKey: 'materials.pillars.kiwi.desc',
    },
    {
      num: '03',
      image: '../../../../assets/image carousel/lychee (1).png',
      titleKey: 'materials.pillars.lychee.title',
      descKey: 'materials.pillars.lychee.desc',
    },
    {
      num: '04',
      image: '../../../../assets/image carousel/blue berry (1).png',
      titleKey: 'materials.pillars.blueberry.title',
      descKey: 'materials.pillars.blueberry.desc',
    },
    {
      num: '05',
      image: '../../../../assets/image carousel/special mango.png',
      titleKey: 'materials.pillars.mango.title',
      descKey: 'materials.pillars.mango.desc',
    },
  ];

  private mediaQuery?: MediaQueryList;
  private mediaListener?: (e: MediaQueryListEvent) => void;
  private raf = 0;

  constructor(
    public languageService: LanguageService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  get translateVw(): number {
    return this.progress * (this.pillars.length - 1) * 100;
  }

  ngAfterViewInit(): void {
    this.mediaQuery = window.matchMedia('(min-width: 1024px)');
    this.isDesktop = this.mediaQuery.matches;
    this.mediaListener = (e: MediaQueryListEvent) => {
      this.isDesktop = e.matches;
      if (!e.matches) {
        this.progress = 0;
        this.stickyStyles = {};
      }
      this.cdr.detectChanges();
      this.queueUpdate();
    };
    this.mediaQuery.addEventListener('change', this.mediaListener);
    this.cdr.detectChanges();
    this.queueUpdate();
  }

  ngOnDestroy(): void {
    if (this.mediaQuery && this.mediaListener) {
      this.mediaQuery.removeEventListener('change', this.mediaListener);
    }
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onScroll(): void {
    this.queueUpdate();
  }

  private queueUpdate(): void {
    if (!this.isDesktop) return;
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.updateFromScroll();
    });
  }

  /**
   * Same scroll-progress math as the React Materials section,
   * plus a JS sticky (fixed) because html/body overflow-x: clip
   * breaks CSS position: sticky.
   */
  private updateFromScroll(): void {
    const el = this.sectionRef?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = el.offsetHeight - vh;
    const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 0));
    const nextProgress = total > 0 ? scrolled / total : 0;

    let nextSticky: Record<string, string>;
    if (rect.top > 0) {
      // Haven't reached section yet
      nextSticky = {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        width: '100%',
      };
    } else if (rect.bottom <= vh) {
      // Past the section — pin panel to section bottom
      nextSticky = {
        position: 'absolute',
        top: 'auto',
        bottom: '0',
        left: '0',
        right: '0',
        width: '100%',
      };
    } else {
      // Inside section — lock panel to viewport (sticky behavior)
      nextSticky = {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        width: '100%',
      };
    }

    this.ngZone.run(() => {
      this.progress = nextProgress;
      this.stickyStyles = nextSticky;
      this.cdr.markForCheck();
    });
  }
}
