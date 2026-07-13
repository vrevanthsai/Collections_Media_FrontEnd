import { inject, Injectable } from '@angular/core';
import { AuthResponse, AuthService } from '../../../auth/services/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  public readonly BASE_URL = 'http://localhost:8080';

  private authService = inject(AuthService);

  // BehaviorSubject = has a "current value", new subscribers get it immediately
  private dataSubject = new BehaviorSubject<AppUser | null>(null);
  sharedData$ = this.dataSubject.asObservable(); // expose read-only stream

  updateData(newValue: AppUser | null): void {
    this.dataSubject.next(newValue);
  }

  constructor(
    private http: HttpClient,
  ) {}

  //  GET- User Details Api by UserId
  getUserById(userId: number): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(
      `${this.BASE_URL}/api/v1/user/${userId}/profile/getuser`,
    );
  }

  //  UPDATE- User Api service method
  updateUserById(userId: number, updatedUserData: UpdateUserRequest): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(
      `${this.BASE_URL}/api/v1/user/${userId}/profile/update-user`,
      updatedUserData
    );
  }

  isAdmin(): boolean {
    // if stored Role has ADMIN value then returns True or else False(USER)
    return this.authService.hasRole('ADMIN');
  }

}

export interface AppUser {
  name: string;
  username: string;
  email: string;
  role: string;
  addedDate: string;
  avatarUrl: string;
}

export interface CookieUserDetails {
  name: string;
  username: string;
  email: string;
  addedDate: string;
}

export type UpdateUserRequest = {
  userId: number,
  email: string,
  name: string,
  username: string,
}