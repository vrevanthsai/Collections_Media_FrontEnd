import { inject, Injectable, signal } from '@angular/core';
import { CookieService } from '../../../../interceptors/cookie.service';
import { AuthResponse, AuthService } from '../../../auth/services/auth';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  public readonly BASE_URL = 'http://localhost:8080';

  private cookieService = inject(CookieService);
  private authService = inject(AuthService);

  // get userDetails from Cookie if exists
  private userDetails: CookieUserDetails = JSON.parse(
    this.cookieService.getCookie('userDetails') || '{}',
  );

  reAssignUserDetails: boolean = false;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
  ) {}

  currentUser = signal<AppUser>({
    name: this.userDetails?.name || '',
    username: this.userDetails?.username || '',
    email: this.userDetails?.email || '',
    role: this.cookieService.getCookie('role') || 'USER',
    addedDate: this.userDetails?.addedDate || '',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112',
  });

  //  GET- User Details Api by UserId
  getUserById(userId: number): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(
      `${this.BASE_URL}/api/v1/user/${userId}/profile/getuser`,
    );
  }

  isAdmin(): boolean {
    // if stored Role has ADMIN value then returns True or else False(USER)
    return this.authService.hasRole('ADMIN');
  }

  // updateAvatar(partial: Partial<AppUser>): void {
  //   // this.currentUser = { ...this.currentUser, ...partial };
  //   this.currentUser.set({ ...this.currentUser, ...partial });
  // }
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
