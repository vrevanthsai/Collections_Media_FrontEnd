import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../pages/auth/services/auth';

// THis file is for route guarding- to protect routes from unauthorized access and only allow logged-IN users to access certain routes like /collections, /add-collection etc. and if user tries to access those routes without login then it will redirect to /login page
export const authGuard: CanActivateFn = (route, state) => {
  // Do Dependency INjection(DI) with inject() signal function - used when we use only function-Files instead of class-component files
  const authService = inject(AuthService); 
  const router = inject(Router);

  // SessionStorage has AccessToken - then returns True or else False
  if(authService.isAuthenticated()){
    return true;
  } else {
    router.navigate(['login']);
    return false;
  }
};
