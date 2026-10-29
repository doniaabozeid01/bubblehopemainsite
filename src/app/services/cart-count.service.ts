// cart-count.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CartCountService {
  private subject = new BehaviorSubject<number>(0);
  cartCount$ = this.subject.asObservable();

  constructor(private api: ApiService) {}

  setCount(count: number) {
    this.subject.next(Math.max(0, count));
    localStorage.setItem('cart_count', String(Math.max(0, count)));
  }

  private latestRefresh = 0;

  /** refresh من السيرفر */
  refresh(branchId: number, userId: string) {
    if (!branchId || !userId) return;
    // A reply for a branch the user already left must not overwrite the current count.
    const request = ++this.latestRefresh;

    this.api.GetCartByUserIdAndBranchId(userId, branchId).subscribe({
      next: (res: any) => {
        if (request !== this.latestRefresh) return;
        const items = res?.cartItems ?? res?.items ?? res?.cart?.cartItems ?? [];
        const count = items.reduce((sum: number, it: any) => sum + (it?.quantity ?? 1), 0);
        this.setCount(count);
      },
      error: (err) => {
        if (request !== this.latestRefresh) return;
        // No cart yet in this branch.
        if (err?.status === 404) this.setCount(0);
      }
    });
  }

  clear() {
    this.setCount(0);
  }
}
