import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class WishlistCountService {
  private subject = new BehaviorSubject<number>(
    Number(localStorage.getItem('wishlist_count') || 0)
  );
  wishlistCount$ = this.subject.asObservable();

  constructor(private api: ApiService) {}

  get count(): number {
    return this.subject.value;
  }

  setCount(count: number) {
    const next = Math.max(0, count);
    this.subject.next(next);
    localStorage.setItem('wishlist_count', String(next));
  }

  increment() {
    this.setCount(this.subject.value + 1);
  }

  decrement() {
    this.setCount(this.subject.value - 1);
  }

  refresh(branchId: number, userId: string) {
    if (!branchId || !userId) return;

    this.api.GetProductFavouriteByUserId(userId, branchId).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        this.setCount(list.length);
      },
      error: () => {
        const cached = Number(localStorage.getItem('wishlist_count') || 0);
        this.subject.next(cached);
      },
    });
  }

  clear() {
    this.setCount(0);
  }
}
