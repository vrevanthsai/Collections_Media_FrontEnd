import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../pages/auth/services/auth';
import { of } from 'rxjs';

// THis file is for protecting Admin based routes- so only admin can access this routes
export const adminGuard: CanActivateFn = (route, state) => {
  // Do Dependency INjection(DI) with inject() signal function - used when we use only function-Files instead of class-component files
  const authService = inject(AuthService);
  const router = inject(Router);

  // we send True- only if User is loggedIN and User- Role is ADMIN
  if (authService.isAuthenticated() && authService.hasRole('ADMIN')) {
    return true;
  } else {
    return of(
      router.createUrlTree(['home'], {
        queryParams: { returnUrl: state.url },
      }),
    );
  };
};
