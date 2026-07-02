import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CookieService } from '../../../interceptors/cookie.service';

// This guard is used to prevent logged-in users from accessing the intro page. If a user is already logged in (i.e., has a valid access token), they will be redirected to the home page instead of being allowed to access the intro page. This is useful for improving user experience by ensuring that logged-in users are directed to the main content of the application rather than seeing an introductory page that is meant for new or unauthenticated users.
// in /home- authGuard is triggerd after redirecting from here then there accessToken is validated for expiry and calls /refresh for getting new accessToken if refreshToken itself is not expired
export const redirectIfLoggedInGuard: CanActivateFn = () => {
  const cookieService = inject(CookieService);
  const router = inject(Router);

  const token = cookieService.getEncryptedCookie('accessToken');

  if (token) {
    // user already logged in, redirect to /home
    router.navigate(['/home']);
    return false; // block access to intro page
  }

  return true; // no token, allow access to intro page
};