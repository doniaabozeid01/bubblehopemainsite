import { Injectable } from '@angular/core';
const CART_KEY = 'cart';

@Injectable({
  providedIn: 'root'
})
export class CartService {
getCart<T = any>(): T | null {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) as T : null;
  }
  setCart(value: any) {
    localStorage.setItem(CART_KEY, JSON.stringify(value));
  }
  clearCart() {
    localStorage.removeItem(CART_KEY);
  }
  // لو عايزة باك أب إضافي أثناء الـcheckout:
  backup() {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) localStorage.setItem(CART_KEY + '_backup', raw);
  }
  restoreFromBackup() {
    const raw = localStorage.getItem(CART_KEY + '_backup');
    if (raw) localStorage.setItem(CART_KEY, raw);
  }
  clearBackup() {
    localStorage.removeItem(CART_KEY + '_backup');
  }
}
