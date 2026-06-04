import { Component } from '@angular/core';
import { LanguageService } from '../../../services/language.service';

export interface OrbitGalleryImage {
  src: string;
  fallback: string;
}

/** Pexels — kids birthdays & wedding celebrations (afrah). */
const PEX = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=520&h=680&fit=crop`;

@Component({
  selector: 'app-bubble-events-section',
  templateUrl: './bubble-events-section.component.html',
  styleUrls: ['./bubble-events-section.component.scss'],
})
export class BubbleEventsSectionComponent {
  readonly orbitFallback = PEX(799443);

  /** 6 kids birthdays + 3 wedding/afrah celebrations. */
  readonly orbitImages: OrbitGalleryImage[] = [
    { src: PEX(7155950), fallback: PEX(7155950) },
    { src: PEX(7155949), fallback: PEX(7155949) },
    { src: PEX(799443), fallback: PEX(799443) },
    { src: PEX(6220553), fallback: PEX(6220553) },
    { src: PEX(6218441), fallback: PEX(6218441) },
    { src: PEX(4001710), fallback: PEX(4001710) },
    { src: PEX(1721833), fallback: PEX(1721833) },
    { src: PEX(2526105), fallback: PEX(2526105) },
    { src: PEX(265088), fallback: PEX(265088) },
  ];

  readonly accentBubbles = [
    { size: 56, x: 8, y: 18, tone: 'orange' },
    { size: 38, x: 88, y: 12, tone: 'blue' },
    { size: 44, x: 72, y: 62, tone: 'cream' },
    { size: 28, x: 14, y: 72, tone: 'teal' },
  ];

  constructor(public languageService: LanguageService) {}

  formatOrbitIndex(index: number): string {
    return String(index + 1).padStart(3, '0');
  }

  onGalleryImageError(event: Event, fallback: string): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallbackApplied'] || img.src === this.orbitFallback) {
      return;
    }
    img.dataset['fallbackApplied'] = 'true';
    img.src = img.src === fallback ? this.orbitFallback : fallback;
  }
}
