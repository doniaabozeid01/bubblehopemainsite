import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { finalize, Observable } from 'rxjs';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {

constructor(private loading: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // تجاهلي ملفات الأصول
    const ignore = req.url.includes('/assets/');
    if (ignore) return next.handle(req);

    this.loading.start();
    return next.handle(req).pipe(finalize(() => this.loading.stop()));
  }
}
