import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../pages/auth/services/auth';
import { catchError, map, of } from 'rxjs';

// THis file is for route guarding- to protect routes from unauthorized access and only allow logged-IN users to access certain routes like /collections, /add-collection etc. and if user tries to access those routes without login then it will redirect to /login page
export const authGuard: CanActivateFn = (route, state) => {
  // Do Dependency INjection(DI) with inject() signal function - used when we use only function-Files instead of class-component files
  const authService = inject(AuthService); 
  const router = inject(Router);

  // SessionStorage has AccessToken - then returns True or else False
  if(authService.isAuthenticated()){
    return true;
  }

  const refreshToken = sessionStorage.getItem('refreshToken');
  authService.setLoggedIn(false);

  // No refresh token means we cannot recover the session, so send the user to login.
  if(!refreshToken){
    // redirect to login page and also pass the blocked URL so that after successful login user can be redirected to the originally requested page
    // of() is used to create an observable that emits a single value and then completes. 
    // createUrlTree() is used to create a URL tree from the given commands and query parameters. It is typically used for navigation and redirection in Angular applications.
    return of(router.createUrlTree(['login'], {
      queryParams: { returnUrl: state.url }
    }));
  }

  // Return the API observable itself so the guard waits for refresh before allowing the route.
  return authService.refreshToken().pipe(
    map(() => {
      // Refresh succeeded, so continue to the route the user originally requested.
      authService.setLoggedIn(true);
      return true;
    }),
    catchError((err) => {
      console.error('Error refreshing access token: ', err);
      authService.setLoggedIn(false);
      // Refresh failed, so redirect to login and remember the blocked URL.
      return of(router.createUrlTree(['login'], {
        queryParams: { returnUrl: state.url }
      }));
    })
  );
};
