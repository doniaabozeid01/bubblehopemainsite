import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-brand-loader',
  templateUrl: './brand-loader.component.html',
  styleUrls: ['./brand-loader.component.scss'],
})
export class BrandLoaderComponent {
  private static nextId = 0;

  readonly arcGradientId: string;
  readonly trailGradientId: string;
  readonly glowFilterId: string;

  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showLogo = true;
  @Input() label = 'Loading...';

  constructor() {
    const id = BrandLoaderComponent.nextId++;
    this.arcGradientId = `brandLoaderArc-${id}`;
    this.trailGradientId = `brandLoaderTrail-${id}`;
    this.glowFilterId = `brandLoaderGlow-${id}`;
  }
}
