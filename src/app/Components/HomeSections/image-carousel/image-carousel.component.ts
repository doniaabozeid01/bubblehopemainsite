import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';

@Component({
  selector: 'app-image-carousel',
  templateUrl: './image-carousel.component.html',
  styleUrls: ['./image-carousel.component.scss'],
})
export class ImageCarouselComponent implements OnInit, OnDestroy {
  /** Current menu drink shots (Cloudinary) — replaces old local bottle/cup assets. */
  private readonly fallbackCups = [
    'assets/image carousel/live/live-1.png',
    'assets/image carousel/live/live-2.png',
    'assets/image carousel/live/live-3.png',
    'assets/image carousel/live/live-4.png',
    'assets/image carousel/live/live-5.png',
    'assets/image carousel/live/live-6.png',
    'assets/image carousel/live/live-7.png',
    'assets/image carousel/live/live-8.png',
  ];

  cups: string[] = [...this.fallbackCups];
  private sub?: Subscription;

  constructor(
    private api: ApiService,
    private branchService: BranchService
  ) {}

  ngOnInit(): void {
    const branchId = this.branchService.getCurrentBranch() ?? 2;
    this.loadDrinkImages(branchId);

    this.sub = this.branchService.currentBranch$.subscribe((id) => {
      if (id) this.loadDrinkImages(id);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private loadDrinkImages(branchId: number): void {
    this.api.GetBestSellerProducts(branchId).subscribe({
      next: (res) => {
        const fromBest = this.extractImages(res);
        if (fromBest.length >= 4) {
          this.cups = fromBest;
          return;
        }

        this.api.GetAllProducts(branchId, undefined, this.api.drinks).subscribe({
          next: (stock) => {
            const fromStock = this.extractImages(stock);
            this.cups = fromStock.length >= 4 ? fromStock : this.fallbackCups;
          },
          error: () => {
            this.cups = fromBest.length ? fromBest : this.fallbackCups;
          },
        });
      },
      error: () => {
        this.cups = this.fallbackCups;
      },
    });
  }

  private extractImages(payload: any): string[] {
    const list = Array.isArray(payload) ? payload : [];
    const urls = new Set<string>();

    const push = (url?: string | null) => {
      if (!url || typeof url !== 'string') return;
      const trimmed = url.trim();
      if (!trimmed) return;
      urls.add(trimmed);
    };

    for (const item of list) {
      // Best-sellers shape
      if (Array.isArray(item?.productImages)) {
        push(item.productImages[0]);
      }
      push(item?.imagePath);
      push(item?.productImage);

      // Stock shape: category groups with nested products
      if (Array.isArray(item?.products)) {
        for (const p of item.products) {
          push(p?.imagePath);
          if (Array.isArray(p?.productImages)) push(p.productImages[0]);
        }
      }
    }

    return Array.from(urls).slice(0, 12);
  }

  /** Enough copies so the row never looks empty on wide screens. */
  private buildTrack(source: string[], copies = 6): string[] {
    const out: string[] = [];
    for (let i = 0; i < copies; i++) out.push(...source);
    return out;
  }

  get track(): string[] {
    return this.buildTrack(this.cups, 8);
  }

  get trackAlt(): string[] {
    return this.buildTrack([...this.cups].reverse(), 8);
  }

  trackByIndex = (index: number) => index;
}
