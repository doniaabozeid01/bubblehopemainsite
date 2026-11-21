import { Injectable, Injector, inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, catchError, retry, throwError, timer } from 'rxjs';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private tokenService = inject(TokenService);
  // SessionService -> AuthService needs HttpClient, which needs this interceptor: resolve it lazily.
  private injector = inject(Injector);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // A token whose expiry has passed is useless: end the session now (the customer is asked
    // to log in again) and send this request as a guest instead of failing with a 401 later.
    if (this.tokenService.isExpired()) {
      this.injector.get(SessionService).endSession(false);
    }

    const raw = this.tokenService.getDecryptedToken() ?? '';
    const hasValidToken = !!raw && raw !== 'null' && raw !== 'undefined' && raw.trim() !== '';

    // لو مفيش توكن صالح → ابعت الطلب زي ما هو
    if (!hasValidToken) return this.withRateLimitRetry(req, next.handle(req));

    // لو فيه توكن صالح → ضيف الهيدر وابعت
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${raw}` }
    });
    return this.withRateLimitRetry(authReq, next.handle(authReq)).pipe(
      catchError((err: unknown) => {
        // The server rejected the stored token (expired, or issued by another backend).
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.injector.get(SessionService).endSession(true);
        }
        return throwError(() => err);
      })
    );
  }

  /**
   * The API answers 429 when a page fires many reads at once (e.g. right after a branch switch).
   * Reads are safe to repeat, so wait and try again instead of leaving the page half-loaded.
   */
  private withRateLimitRetry(req: HttpRequest<any>, source: Observable<HttpEvent<any>>) {
    if (req.method !== 'GET') return source;
    return source.pipe(
      retry({
        count: 3,
        delay: (err, attempt) => {
          if (!(err instanceof HttpErrorResponse) || err.status !== 429) return throwError(() => err);
          const retryAfter = Number(err.headers?.get('Retry-After'));
          const ms = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 600 * attempt + Math.random() * 400;
          return timer(Math.min(ms, 5000));
        },
      })
    );
  }
}
