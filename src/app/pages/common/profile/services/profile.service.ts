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
  private avatarUrlSubject = new BehaviorSubject<Blob | undefined>(undefined);
  sharedAvatarBlobData$ = this.avatarUrlSubject.asObservable(); // expose read-only stream for avatarUrl

  updateData(newValue: AppUser | null): void {
    this.dataSubject.next(newValue);
  }

  updateAvatarBlobData(newAvatarUrl: Blob | undefined): void {
    this.avatarUrlSubject.next(newAvatarUrl);
  }

  /** Call this on logout so no stale user data leaks into the next session */
  clearProfileState(): void {
    this.dataSubject.next(null);
    this.avatarUrlSubject.next(undefined);
  }

  constructor(private http: HttpClient) {}

  //  GET- User Details Api by UserId
  getUserById(userId: number): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(
      `${this.BASE_URL}/api/v1/user/${userId}/profile/getuser`,
    );
  }

  //  UPDATE- User Api service method
  updateUserById(
    userId: number,
    updatedUserData: UpdateUserRequest,
    file: File | null,
  ): Observable<AuthResponse> {
    // we send both payload and file as seperate args to backend using FormData
    const formData = new FormData();
    // formData- both Keys - naming MUST be SAME as declared in Backend-Api-Method params and same types for Better data mapping
    formData.append('profileRequest', JSON.stringify(updatedUserData));
    if (file !== null) {
      formData.append('file', file);
    }
    return this.http.put<AuthResponse>(
      `${this.BASE_URL}/api/v1/user/${userId}/profile/update-user`,
      formData,
    );
  }

  // Get User Avatar/Profile-pic image Api method
  getUserAvatarImage(userId: number): Observable<Blob> {
    return this.http.get(
      `${this.BASE_URL}/api/v1/user/${userId}/profile/get-user-image`,
      { responseType: 'blob' },
    );
  }

  isAdmin(): boolean {
    // if stored Role has ADMIN value then returns True or else False(USER)
    return this.authService.hasRole('ADMIN');
  }

  // Change Password Api service method
  changePassword(
    userId: number,
    payload: ChangePasswordRequest,
  ): Observable<ChangePwdResponse> {
    return this.http.put<ChangePwdResponse>(
      `${this.BASE_URL}/api/v1/user/${userId}/profile/change-password`,
      payload,
    );
  }

  // ===== ADMIN APIs ====
  getAllUsers(userId: number): Observable<GetAllUsersResponse[]> {
    return this.http.get<GetAllUsersResponse[]>(
      `${this.BASE_URL}/api/v1/user/${userId}/admin/getAllUsers`,
    );
  }

  // Suspend/Activate User Api service method
  suspendOrActivateUser(userId: number, suspendedUserId: number, suspendValue: string): Observable<string> {
    return this.http.put(
      `${this.BASE_URL}/api/v1/user/${userId}/admin/suspend-user/${suspendedUserId}/${suspendValue}`,
      null, // no body needed for this request
      { responseType: 'text' } // expecting a plain text response
    );
  }
}

export interface AppUser {
  name: string;
  username: string;
  email: string;
  role: string;
  addedDate: string;
  avatarUrl: string | undefined;
}

export interface CookieUserDetails {
  name: string;
  username: string;
  email: string;
  addedDate: string;
  avatarName: string; // or profile-pic/img name
}

export type UpdateUserRequest = {
  userId: number;
  email: string;
  name: string;
  username: string;
};

export type ChangePasswordRequest = {
  oldPwd: string;
  newPwd: string;
};

export type ChangePwdResponse = {
  success: boolean;
  message: string;
  data: string;
};

export type GetAllUsersResponse = {
  userId: number;
  name: string;
  username: string;
  email: string;
  role: string;
  suspended: boolean;
  addedDate: string;
  status?: string; // "Active" or "Suspended" // optional field
};
