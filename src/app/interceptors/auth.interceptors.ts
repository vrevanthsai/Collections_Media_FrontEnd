import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../pages/auth/services/auth";
import { catchError, switchMap, throwError } from "rxjs";
import { Router } from "@angular/router";

// This function will be used to intercept the Http Requests(CRUD) and add the accessToken in the header of the request if it is available in the sessionStorage. 
// It will also handle the token refresh logic if the accessToken is expired and refreshToken is available.
// interceptors are like filters before sending req to Api(CRUD) and before sending response to component- it can modify the req and response both
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn){
    // DI using inject() for function files
    const authService = inject(AuthService);

    // for below api-endpoints- we dont need to add token in hearders - so just forward the req to next
    if(
        req.url.includes('/login') ||
        req.url.includes('/register') ||
        req.url.includes('/refresh')
    ){
        return next(req);
    }

    // For Authenticated Users- for all other api-endpoints - we provide adding token to header logic
    if(authService.isAuthenticated()){
        const token = sessionStorage.getItem('accessToken');
        req = addToken(req,token!!); // !! - checks token is not null
    }

    // For Un-Authenticated(not loggedIn) Users
    // when jwtToken(accessToken present in sessionStorage) is expired then we send error
    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // 401 = UnAuthorized Error- when jwtToken is expired
            if(error.status === 401){
                return handle401Error(req, next);
            }
            // for all other type of errors- we throw its error
            return throwError(() => error);
        })
    )
}

// Here we give logic for adding accessToken to req.Headers and this function logic is used mutliple times
function addToken(req: HttpRequest<unknown>, token: string){
    // we clone the req and add token to its header and send it to interceptor
    return req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`, // same key/value- naming should be
        }
    })
}

// This function handles 401(unauthorized) error of interceptors
function handle401Error(req: HttpRequest<unknown>, next: HttpHandlerFn){
    const authService = inject(AuthService);
    const router = inject(Router);

    // This either returns a new AccessToken if provided refreshToken is valid 
    //  or if provided refreshToken itself expired then we handle it in pipe() of /refresh api
    return authService.refreshToken().pipe(
        // when we get new AccessToken then we add it to header and forward the req to next
        // switchMap() is used to switch from one Observable to another Observable and return the new Observable
        switchMap((token: string) => {
            sessionStorage.setItem('accessToken', token); // token - is new AccessToken
            return next(addToken(req, token));
        }),
        // when we get error(like our provided RefreshToken is Expired) while getting new token then we logout user and navigate to login page
        catchError((err) => {
            authService.logout();
            router.navigate(['login']);
            return throwError(() => err); // return the error
        })
    )
}

///// Note -
// if AccessToken is expired then we get new AccessToken using refreshToken function of authService and add it to header and forward the req to next
// if RefreshToken is also expired then we logout user and navigate to login page