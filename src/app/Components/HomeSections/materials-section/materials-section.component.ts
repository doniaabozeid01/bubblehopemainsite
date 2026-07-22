import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
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
export class MaterialsSectionComponent implements OnInit, OnDestroy {
  @ViewChild('sectionRef', { static: true }) sectionRef!: ElementRef<HTMLElement>;

  progress = 0;
  isDesktop = false;

  readonly pillars: MaterialPillar[] = [
    {
      num: '01',
      image: '../../../../assets/image carousel/black milk tea edit.png',
      titleKey: 'materials.pillars.tea.title',
      descKey: 'materials.pillars.tea.desc',
    },
    {
      num: '02',
      image: '../../../../assets/image carousel/matcha boba edit.png',
      titleKey: 'materials.pillars.pearls.title',
      descKey: 'materials.pillars.pearls.desc',
    },
    {
      num: '03',
      image: '../../../../assets/image carousel/tiger brown creme brulee edit.png',
      titleKey: 'materials.pillars.milk.title',
      descKey: 'materials.pillars.milk.desc',
    },
    {
      num: '04',
      image: '../../../../assets/image carousel/MANGO 1 edit.png',
      titleKey: 'materials.pillars.fruit.title',
      descKey: 'materials.pillars.fruit.desc',
    },
  ];

  private mediaQuery?: MediaQueryList;
  private mediaListener?: (e: MediaQueryListEvent) => void;

  constructor(public languageService: LanguageService) {}

  ngOnInit(): void {
    this.mediaQuery = window.matchMedia('(min-width: 1024px)');
    this.isDesktop = this.mediaQuery.matches;
    this.mediaListener = (e: MediaQueryListEvent) => {
      this.isDesktop = e.matches;
      if (!e.matches) {
        this.progress = 0;
      } else {
        this.updateProgress();
      }
    };
    this.mediaQuery.addEventListener('change', this.mediaListener);
    this.updateProgress();
  }

  ngOnDestroy(): void {
    if (this.mediaQuery && this.mediaListener) {
      this.mediaQuery.removeEventListener('change', this.mediaListener);
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.isDesktop) return;
    this.updateProgress();
  }

  get translatePercent(): number {
    return this.progress * (this.pillars.length - 1) * 100;
  }

  get trackWidthVw(): number {
    return this.pillars.length * 100;
  }

  private updateProgress(): void {
    const el = this.sectionRef?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 0));
    this.progress = total > 0 ? scrolled / total : 0;
  }
}
