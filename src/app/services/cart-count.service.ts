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

  /** refresh من السيرفر */
  refresh(branchId: number, userId: string) {
    if (!branchId || !userId) return;

    // ✅ غيّري اسم الميثود دي حسب API عندك
    this.api.GetCartByUserIdAndBranchId(userId, branchId).subscribe({
      next: (res: any) => {
        // عدّلي حسب شكل الريسبونس الحقيقي
        const items = res?.cartItems ?? res?.items ?? res?.cart?.cartItems ?? [];
        const count = items.reduce((sum: number, it: any) => sum + (it?.quantity ?? 1), 0);
        this.setCount(count);
      },
      error: () => {
        const cached = Number(localStorage.getItem('cart_count') || 0);
        this.subject.next(cached);
      }
    });
  }

  clear() {
    this.setCount(0);
  }
}
