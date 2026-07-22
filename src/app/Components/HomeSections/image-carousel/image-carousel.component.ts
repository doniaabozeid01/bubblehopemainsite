import { Component } from '@angular/core';

@Component({
  selector: 'app-image-carousel',
  templateUrl: './image-carousel.component.html',
  styleUrls: ['./image-carousel.component.scss'],
})
export class ImageCarouselComponent {
  readonly cups = [
    '../../../../assets/image carousel/Isolation_Mode.png',
    '../../../../assets/image carousel/tiger brown creme brulee edit.png',
    '../../../../assets/image carousel/matcha boba edit.png',
    '../../../../assets/image carousel/black milk tea edit.png',
    '../../../../assets/image carousel/MANGO 1 edit.png',
    '../../../../assets/image carousel/blue berry (1).png',
  ];

  /** Enough copies so the row never looks empty on wide screens. */
  private buildTrack(source: string[], copies = 6): string[] {
    const out: string[] = [];
    for (let i = 0; i < copies; i++) out.push(...source);
    return out;
  }

  /** Row 1 — even count of sets for seamless -50% loop. */
  get track(): string[] {
    return this.buildTrack(this.cups, 8);
  }

  /** Row 2 — reversed, same length for seamless loop. */
  get trackAlt(): string[] {
    return this.buildTrack([...this.cups].reverse(), 8);
  }

  trackByIndex = (index: number) => index;
}
