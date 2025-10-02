import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenService } from '../services/token.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private tokenService = inject(TokenService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const raw = this.tokenService.getDecryptedToken() ?? '';
    const hasValidToken = !!raw && raw !== 'null' && raw !== 'undefined' && raw.trim() !== '';

    // لو مفيش توكن صالح → ابعت الطلب زي ما هو
    if (!hasValidToken) return next.handle(req);

    // لو فيه توكن صالح → ضيف الهيدر وابعت
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${raw}` }
    });
    return next.handle(authReq);
  }
}
