import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {

private pending = 0;
  private _loading$ = new BehaviorSubject<boolean>(true); // يبدأ ظاهرًا عند أول فتح
  readonly isLoading$ = this._loading$.asObservable();

  private minDelay = 400;           // لتفادي فلاش سريع
  private lastShownAt = Date.now();

  start() {
    if (this.pending === 0) {
      this.lastShownAt = Date.now();
      this._loading$.next(true);
    }
    this.pending++;
  }

  stop() {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending === 0) {
      const elapsed = Date.now() - this.lastShownAt;
      const wait = Math.max(0, this.minDelay - elapsed);
      setTimeout(() => this._loading$.next(false), wait);
    }
  }

  // لو عايزة تخفيه بالقوة (مثلاً لو مفيش API أصلاً)
  hideNow() { this.pending = 0; this._loading$.next(false); }}
