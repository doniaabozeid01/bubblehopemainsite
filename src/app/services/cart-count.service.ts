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

  /** Remember a cart that already exists, so later pages can ask for it. */
  noteCart(userId: string, branchId: number) {
    if (!userId || !branchId) return;
    localStorage.setItem(this.key(userId, branchId), '1');
  }

  hasCart(userId: string, branchId: number): boolean {
    return !!userId && !!branchId && localStorage.getItem(this.key(userId, branchId)) === '1';
  }

  forgetCart(userId: string, branchId: number) {
    if (!userId || !branchId) return;
    localStorage.removeItem(this.key(userId, branchId));
  }

  /**
   * Asks for the cart only after one has been created.
   * GetCartByUserId answers 404 when this user has no cart, and the browser
   * prints that 404 (with the user id) even though the count is just zero.
   */
  refresh(branchId: number, userId: string) {
    if (!branchId || !userId) return;
    if (localStorage.getItem(this.key(userId, branchId)) !== '1') {
      this.setCount(0);
      return;
    }

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
        if (err?.status === 404) {
          this.forgetCart(userId, branchId);
          this.setCount(0);
        }
      }
    });
  }

  clear() {
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cart_open:')) drop.push(key);
    }
    drop.forEach((key) => localStorage.removeItem(key));
    this.setCount(0);
  }

  private key(userId: string, branchId: number) {
    return `cart_open:${userId}:${Number(branchId)}`;
  }
}
