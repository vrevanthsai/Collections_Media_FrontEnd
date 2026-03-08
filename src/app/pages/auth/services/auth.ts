import { HttpClient } from '@angular/common/http';
import { Injectable, signal, WritableSignal } from '@angular/core';
import { Observable, tap } from 'rxjs';

// This service file will handle all backend auth APIs integration logic
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Todo- create and import base URL from .env file
  public readonly BASE_URL = 'http://localhost:8080';
  // Signal- used for State management - to know current state of User(loggedIN or loggedOut)
  // if signal value changed then it reflects all over application
  private loggedIn = signal<boolean>(this.isAuthenticated()); // initial value is from function call
  // get user info from sessionStorage which is stored after user logged-In(or login-service-method)
  private name = signal<string | null>(sessionStorage.getItem('name')); 


  // DI for HttpClient for API integrations
  constructor(private http: HttpClient) {}

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
            if (response && response.accessToken) {
              // TODO - encrypt the tokens and info further before storing them in Browser sessions
              // TOTO- store this data in localStorage/cookies instead of sessionStorage 
              // because sessionStorage is cleared when the page session ends, while localStorage persists even after the browser is closed. Cookies can also be used for storing data that needs to be sent to the server with each request, such as authentication tokens.
              sessionStorage.setItem('accessToken', response.accessToken); // key-value
              sessionStorage.setItem('refreshToken', response.refreshToken);
              sessionStorage.setItem('name', response.name);
              sessionStorage.setItem('email', response.email);
              sessionStorage.setItem('username', response.username);
            }
          }),
        )
    );
  }

  // Getter/Setter for name signal variable
  setName(value: string | null){
    this.name.set(value);
  }
  getName() : WritableSignal<string | null>{
    return this.name;
  }

  // check user logged-in or not- used in navbar component for conditional rendering of login/logout button and to show user name
  // this function is useful to set True to User-State when user comes after 1st loggedIN then no logIn is needed for User to enter
  isAuthenticated(): boolean{
    // !! returns TRUE when it has a value or FALSE
    return !!sessionStorage.getItem('accessToken');
  }

  // Logout Feature - clears all stored user tokens and info from sessions which means user logged out
  logout(): void{
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('name');
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('username');
  }

  // Setter/ Getter Methods of Signal-variable
  setLoggedIn(value: boolean){
    this.loggedIn.set(value);
  }

  getLoggedIn() : WritableSignal<boolean>{
    return this.loggedIn;
  }
}

// Type of payload to be sent to register API-backend
// (must have same name and type as backend API request body)
// these Types will be used in other files so
// Todo- create separate file for types and import from there in all files to avoid redundancy and for better code management
export type RegisterRequest = {
  name: string,
  email: string,
  username: string,
  password: string,
}

export type LoginRequest = {
  email: string,
  password: string,
}

// Type of same auth response from both backend register/login APIs
export type AuthResponse = {
  accessToken: string,
  refreshToken: string,
  name: string,
  email: string,
  username: string,
}