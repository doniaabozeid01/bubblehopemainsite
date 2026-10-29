import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { defer, finalize, Observable } from 'rxjs';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {

constructor(private loading: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const ignore = req.url.includes('/assets/');
    if (ignore) return next.handle(req);

    // Count per subscription so retried requests start and stop the spinner in pairs.
    return defer(() => {
      this.loading.start();
      return next.handle(req).pipe(finalize(() => this.loading.stop()));
    });
  }
}
