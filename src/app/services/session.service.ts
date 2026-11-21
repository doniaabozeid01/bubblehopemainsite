import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ActiveOrdersService } from './active-orders.service';
import { AuthService } from './auth.service';
import { CartCountService } from './cart-count.service';
import { TokenService } from './token.service';
import { WishlistCountService } from './wishlist-count.service';

/** Pages that only make sense for a signed-in customer. */
const PROTECTED_PREFIXES = ['/cart', '/checkout', '/wishlist', '/allorders', '/profile', '/payment'];

/** How often an open tab re-checks that the login has not expired. */
const CHECK_EVERY_MS = 30_000;

/**
 * One place that decides what happens when the login is no longer valid
 * (token expired, or rejected by the server): clean everything and ask the
 * customer to log in again, instead of leaving empty carts and error toasts.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private watching = false;

  constructor(
    private tokens: TokenService,
    private auth: AuthService,
    private router: Router,
    private cartCount: CartCountService,
    private wishlistCount: WishlistCountService,
    private activeOrders: ActiveOrdersService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private zone: NgZone
  ) {}

  /** True when a token is stored but its expiry has passed. */
  isExpired(): boolean {
    return this.tokens.isExpired();
  }

  /**
   * Signs the customer out locally and sends them to the login page.
   * @param redirectAlways true for a server 401 (go to login wherever they are);
   *   false for a proactive expiry check, which only redirects from pages that need an account.
   * Safe to call many times: it does nothing once the token is gone.
   */
  endSession(redirectAlways = false): void {
    if (!localStorage.getItem('token')) return;

    this.auth.logout();
    this.tokens.removeToken();
    this.cartCount.setCount(0);
    this.wishlistCount.clear();
    this.activeOrders.stop();

    this.toastr.warning(this.translate.instant('session.expired'));

    const current = this.router.url;
    if (current.startsWith('/auth')) return;
    if (redirectAlways || this.isProtectedUrl(current)) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: current } });
    }
  }

  isProtectedUrl(url: string): boolean {
    const path = url.split('?')[0].split('#')[0];
    return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
  }

  /** Starts the background expiry check (call once at app start). */
  watch(): void {
    if (this.watching) return;
    this.watching = true;

    const check = () => {
      if (this.isExpired()) this.zone.run(() => this.endSession(false));
    };

    check();
    // Timers in a hidden tab are throttled; re-check the moment the tab is used again.
    this.zone.runOutsideAngular(() => {
      setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check();
      });
      window.addEventListener('focus', check);
    });
  }
}
