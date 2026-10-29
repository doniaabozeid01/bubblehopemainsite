import { Component } from '@angular/core';
import { LanguageService } from '../../../services/language.service';

export interface OrbitGalleryImage {
  src: string;
  fallback: string;
}

const ORBIT = (n: number) => `assets/brand/events/orbit-${n}.webp`;

@Component({
  selector: 'app-bubble-events-section',
  templateUrl: './bubble-events-section.component.html',
  styleUrls: ['./bubble-events-section.component.scss'],
})
export class BubbleEventsSectionComponent {
  readonly orbitFallback = ORBIT(1);

  readonly orbitImages: OrbitGalleryImage[] = Array.from({ length: 9 }, (_, i) => ({
    src: ORBIT(i + 1),
    fallback: ORBIT(1),
  }));

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
