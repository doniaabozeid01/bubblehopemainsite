import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of } from 'rxjs';
import { ApiService } from './api.service';

/** The favourites API can return items saved in other branches; keep only the current one. */
export function favouritesForBranch(res: any, branchId: number | string): any[] {
  const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
  const id = Number(branchId);
  return list.filter((x: any) => x?.branchId == null || Number(x.branchId) === id);
}

/** Product ids flagged isFavorite in a branch catalog, or null when the catalog has no such flag. */
function favouriteIdsInCatalog(res: any): Set<number> | null {
  const groups = Array.isArray(res) ? res : [];
  const products: any[] = groups.flatMap((g: any) =>
    Array.isArray(g?.products) ? g.products : [g]
  );
  if (!products.some((p) => p && 'isFavorite' in p)) return null;
  return new Set(products.filter((p) => p?.isFavorite).map((p) => Number(p.id ?? p.productId)));
}

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

  /**
   * Favourites saved in this branch only. The favourites endpoint ignores branchId, but the
   * branch catalog marks isFavorite per branch, so the catalog decides what belongs here.
   */
  loadForBranch(userId: string, branchId: number): Observable<any[]> {
    return forkJoin({
      favourites: this.api.GetProductFavouriteByUserId(userId, branchId),
      catalog: this.api.GetBranchProductsFresh(branchId, userId).pipe(catchError(() => of(null))),
    }).pipe(
      map(({ favourites, catalog }) => {
        const list = favouritesForBranch(favourites, branchId);
        const ids = favouriteIdsInCatalog(catalog);
        return ids ? list.filter((x) => ids.has(Number(x.productId ?? x.id))) : list;
      })
    );
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

  private latestRefresh = 0;

  refresh(branchId: number, userId: string) {
    if (!branchId || !userId) return;
    const request = ++this.latestRefresh;

    this.loadForBranch(userId, branchId).subscribe({
      next: (list) => {
        if (request === this.latestRefresh) this.setCount(list.length);
      },
    });
  }

  clear() {
    this.setCount(0);
  }
}
