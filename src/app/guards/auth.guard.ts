import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const session = inject(SessionService);
  const loginUrl = () =>
    router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });

  if (!localStorage.getItem('token')) return loginUrl();

  // The token is still stored but has expired: clean up and ask for a fresh login
  // here, before the page loads an empty cart / orders list and shows errors.
  if (session.isExpired()) {
    session.endSession(false);
    return loginUrl();
  }

  return true;
};
