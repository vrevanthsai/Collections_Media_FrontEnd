import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { CookieService } from '../../../interceptors/cookie.service';
import { ThemeService } from '../../services/theme-service';

// This service file will handle all backend auth APIs integration logic
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Todo- create and import base URL from .env file
  public readonly BASE_URL = 'http://localhost:8080';
  // Signal- used for State management - to know current state of User(loggedIN or loggedOut)
  // if signal value changed then it reflects all over application
  private loggedIn = signal<boolean>(false);
  private cookieService = inject(CookieService);
  // get user info from cookie which is stored after user logged-In(or login-service-method)
  private userDetails = JSON.parse(this.cookieService.getCookie('userDetails') || '{}');
  private name = signal<string | null>(this.userDetails.name || null);
  themeService = inject(ThemeService);

  // DI for HttpClient for API integrations
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // when page loads then we check user is loggedIN or not and set the User-State accordingly
    this.loggedIn.set(this.isAuthenticated());
  }

  // Register Api integration
  register(registerRequest: RegisterRequest): Observable<AuthResponse> {
    // TODO - add error handling logic to all Api functions
    return this.http.post<AuthResponse>(
      `${this.BASE_URL}/api/v1/auth/register`,
      registerRequest,
    );
  }

  // Login Api integration
  login(loginRequest: LoginRequest): Observable<AuthResponse> {
    return (
      this.http
        .post<AuthResponse>(`${this.BASE_URL}/api/v1/auth/login`, loginRequest)
        // pipe(tap()) is used to perform side effects (like logging, modifying data, etc.) on the observable stream without affecting the actual data being emitted. In this case, it can be used to log the response or handle any additional logic after receiving the response from the register API,
        //  without modifying the AuthResponse object that is returned to the caller of the register method.
        // it intercepts the response from API before sending it to the component
        .pipe(
          tap((response) => {
            if (response && response?.data?.accessToken) {
              // storing user-data in browser cookie instead of sessionSorage
              this.cookieService.setEncryptedCookie('accessToken', response.data.accessToken, 7); // key-value and 7 days expiry
              this.cookieService.setEncryptedCookie('refreshToken', response.data.refreshToken, 7);
              this.cookieService.setCookie('userId', JSON.stringify(response.data.userId), 7); // store userId-type number as string
              
              let userDetails = {
                name: response.data.name,
                email: response.data.email,
                username: response.data.username,
                addedDate: response.data.addedDate,
                avatarName: response.data.imagename || '', // if user has uploaded profile-pic then it will be present or else empty string
              };
              this.cookieService.setCookie('userDetails', JSON.stringify(userDetails), 7);           

              // Getting Roles info from extracting token
              const decodedToken: any = jwtDecode(response.data.accessToken);
              // console.log("decoded token: ", decodedToken);
              // role is array/collection data from claims of jwt of backend and first item has Role data
              // sessionStorage.setItem('role', decodedToken.role[0].authority);
              this.cookieService.setCookie('role', decodedToken.role[0].authority, 7);
            }
          }),
        )
    );
  }

  // Getter/Setter for name signal variable
  setName(value: string | null) {
    this.name.set(value);
  }
  getName(): WritableSignal<string | null> {
    return this.name;
  }

  // check user logged-in or not- used in navbar component for conditional rendering of login/logout button and to show user name
  // this function is useful to set True to User-State when user comes after 1st loggedIN then no logIn is needed for User to enter
  isAuthenticated(): boolean {
    const token = this.cookieService.getEncryptedCookie('accessToken');
    // we parallelly update loggedIn siganl of auth service - so that when ever auth-guard of app.route checks for user authentication then loggedIn siganl is also updated with correct state value -
    // so that it will reflect all over(in navbar comp to show selected nav-links depending on user loggedIn state) application
    this.loggedIn.set(!!token && !this.isTokenExpired(token));
    // token should not be null and Token is not expired then returns True or else False
    return token != null && !this.isTokenExpired(token);
  }

  // Logout Feature - clears all stored user tokens and info from sessions which means user logged out
  logout(): void {
    this.cookieService.deleteCookie('accessToken');
    this.cookieService.deleteCookie('refreshToken');
    this.cookieService.deleteCookie('userId');
    this.cookieService.deleteCookie('role');
    this.cookieService.deleteCookie('userDetails');
    // Clear/remove categories-array data of user in localStorage
    localStorage.removeItem('categories');
    localStorage.removeItem('favoriteCollectionIds');
    localStorage.removeItem('darkMode');
    // when logout revert theme back to dark
    this.themeService.setTheme(true);
  }

  // Setter/ Getter Methods of Signal-variable
  setLoggedIn(value: boolean) {
    this.loggedIn.set(value);
  }

  getLoggedIn(): WritableSignal<boolean> {
    return this.loggedIn;
  }

  // This method checks whether provided token is valid/expired or not
  isTokenExpired(token: string): boolean {
    // jwtDecode(token) is used for decoding token and getting info from it
    const decodedToken: any = jwtDecode(token);
    // if token has expired time less then current-time then returns False(Token Not Expired) or else True(Token Expired)
    return decodedToken.exp * 1000 < Date.now();
  }

  // THis method Gets new Access Token(jwtToken) when available refreshToken is valid
  // THis method returns async value- so we use Observable-Return-Type
  refreshToken(): Observable<any> {
    const refToken = this.cookieService.getEncryptedCookie('refreshToken');
    const refTokenObj: RefreshTokenRequest = {
      refreshToken: refToken,
    };
    // Post Api call-args- Api-URL, payload
    return this.http
      .post(`${this.BASE_URL}/api/v1/auth/refresh`, refTokenObj)
      .pipe(
        // we get res.accessToken which is new AccessToken and we replace it with old token in cookie
        // and refreshToken will not change
        tap((res: any) =>
          this.cookieService.setEncryptedCookie('accessToken', res.accessToken, 7),
        ),
        catchError((err) => {
          // when we get error(like our provided RefreshToken is Expired) while getting new token then we logout user
          this.logout();
          // TODO- give better error handling and ask user to relogin after logout due to error
          return throwError(() => err);
        }),
      );
  }

  // This method handles Role verifying and its logic
  hasRole(role: string): boolean {
    const token = this.cookieService.getEncryptedCookie('accessToken');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      // returns True- if token has role-matching data or else False
      return decodedToken?.role[0]?.authority.includes(role);
    }

    return false;
  }
}

// Type of payload to be sent to register API-backend
// (must have same name and type as backend API request body)
// these Types will be used in other files so
// Todo- create separate file for types and import from there in all files to avoid redundancy and for better code management
export type RegisterRequest = {
  name: string;
  email: string;
  username: string;
  password: string;
  selectedCategories: string[];
  addedDate: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

// Type of same auth response from both backend register/login APIs
export type AuthResponse = {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    userId: number;
    name: string;
    email: string;
    username: string;
    addedDate: string;
    imagename?: string; // optional field - if user has uploaded profile-pic then it will be present or else not
  };
};

export type RefreshTokenRequest = {
  refreshToken: string | null; // string or null
};
