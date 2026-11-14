import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { ApiService } from './api.service';

/** Statuses after which an order is finished and needs no more tracking. */
const FINISHED_STATUSES = ['delivered', 'canceled', 'cancelled', 'completed', 'rejected', 'failed'];

/**
 * Tracks how many of the signed-in user's orders are still in progress
 * (pending / confirmed / on the way) so the navbar can show a badge.
 * Polls the server while a user is signed in; call stop() on logout.
 */
@Injectable({ providedIn: 'root' })
export class ActiveOrdersService implements OnDestroy {
  private readonly subject = new BehaviorSubject<number>(0);
  readonly count$ = this.subject.asObservable();

  private userId: string | null = null;
  private pollSub?: Subscription;
  private requestSeq = 0;

  constructor(private api: ApiService) {}

  static isActiveStatus(status: string | null | undefined): boolean {
    return !FINISHED_STATUSES.includes(String(status ?? '').trim().toLowerCase());
  }

  /** Begin (or switch) tracking for a user; refreshes now and then every `everyMs`. */
  start(userId: string, everyMs = 15000): void {
    if (!userId) return;
    if (this.userId === userId && this.pollSub && !this.pollSub.closed) return;

    this.stop();
    this.userId = userId;

    // Poll only while the tab is visible, and catch up the moment the user comes back to it.
    this.pollSub = timer(0, everyMs).subscribe(() => {
      if (!document.hidden) this.refresh();
    });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private onVisibility = () => {
    if (!document.hidden) this.refresh();
  };

  /** Orders only change on the server, so call this after placing one. */
  refresh(): void {
    const userId = this.userId;
    if (!userId) return;

    const seq = ++this.requestSeq;
    this.api.getOrdersByUserId(userId).subscribe({
      next: (orders: any) => {
        if (seq !== this.requestSeq) return;
        const list = Array.isArray(orders) ? orders : [];
        this.subject.next(list.filter((o) => ActiveOrdersService.isActiveStatus(o?.status)).length);
      },
      // Keep the last known count on network errors; a 404 just means "no orders yet".
      error: (err) => {
        if (seq === this.requestSeq && err?.status === 404) this.subject.next(0);
      },
    });
  }

  /** Orders list already fetched elsewhere (allorders page) — update the badge immediately. */
  setFromOrders(orders: any[]): void {
    this.subject.next((orders || []).filter((o) => ActiveOrdersService.isActiveStatus(o?.status)).length);
  }

  stop(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
    this.userId = null;
    this.requestSeq++;
    this.subject.next(0);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
