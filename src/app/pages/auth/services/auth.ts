import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// This service file will handle all backend auth APIs integration logic
@Injectable({
  providedIn: 'root',
})
export class AuthService {

  // Todo- create and import base URL from .env file
  public readonly BASE_URL = "http://localhost:8080";

  // DI for HttpClient for API integrations
  constructor(private http: HttpClient){}

  // Register Api integration
  register(registerRequest: RegisterRequest): Observable<AuthResponse>{
    return this.http.post<AuthResponse>(`${this.BASE_URL}/api/v1/auth/register`, registerRequest);
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

// Type of same auth response from both backend register/login APIs
export type AuthResponse = {
  accessToken: string,
  refreshToken: string,
  name: string,
  email: string,
  username: string,
}