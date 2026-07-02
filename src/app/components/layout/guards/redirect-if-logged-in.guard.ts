import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CookieService } from '../../../interceptors/cookie.service';
import { AuthService } from '../../../pages/auth/services/auth';

export const redirectIfLoggedInGuard: CanActivateFn = () => {
  const cookieService = inject(CookieService);
  const router = inject(Router);
  const authService = inject(AuthService); 

  const token = cookieService.getCookie('accessToken');

  if (token && authService.isAuthenticated()) {
    // user already logged in, redirect to /home
    router.navigate(['/home']);
    return false; // block access to intro page
  }

  return true; // no token, allow access to intro page
};