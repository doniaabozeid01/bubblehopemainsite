import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private pending = 0;
  private _loading$ = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this._loading$.asObservable();

  private readonly minDelay = 400;
  private lastShownAt = 0;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private safetyTimer?: ReturnType<typeof setTimeout>;
  private readonly safetyMs = 10000;

  start(): void {
    if (this.pending === 0) {
      this.lastShownAt = Date.now();
      this._loading$.next(true);
      this.armSafety();
    }
    this.pending++;
  }

  stop(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending !== 0) return;

    this.disarmSafety();
    const elapsed = Date.now() - this.lastShownAt;
    const wait = Math.max(0, this.minDelay - elapsed);

    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (this.pending === 0) {
        this._loading$.next(false);
      }
    }, wait);
  }

  hideNow(): void {
    this.pending = 0;
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
    this.disarmSafety();
    this._loading$.next(false);
  }

  private armSafety(): void {
    this.disarmSafety();
    this.safetyTimer = setTimeout(() => this.hideNow(), this.safetyMs);
  }

  private disarmSafety(): void {
    if (!this.safetyTimer) return;
    clearTimeout(this.safetyTimer);
    this.safetyTimer = undefined;
  }
}
