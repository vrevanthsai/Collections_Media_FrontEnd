import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import {
  GetAllUsersResponse,
  ProfileService,
} from '../services/profile.service';
import { CookieService } from '../../../../interceptors/cookie.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
})
export class UserManagementComponent {
  profileService = inject(ProfileService);
  searchTerm = '';
  private cookieService = inject(CookieService);
  userId = parseInt(this.cookieService.getCookie('userId') || '0', 10);
  messageService = inject(MessageService);

  users: GetAllUsersResponse[] = [];
  isLoading: boolean = false;

  ngOnInit(): void {
    this.loadAllUsers();
  }

  // FrontEnd-Filtering based on search term- so that back /search-user api usage not needed
  get filteredUsers(): GetAllUsersResponse[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.users;
    return this.users.filter(
      (u) =>
        u.username.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term),
    );
  }

  loadAllUsers(): void {
    this.isLoading = true;
    this.profileService.getAllUsers(this.userId).subscribe({
      next: (res: GetAllUsersResponse[]) => {
        this.users = res;
        this.filteredUsers; // trigger filtering after loading users
        this.isLoading = false;
      },
      error: (err) => {
        console.log('Error while fetching All Users data: ', err);
        this.messageService.add({
          severity: 'error',
          summary:
            err?.error?.message || 'Error while fetching All Users data',
          detail: 'Try again!',
          life: 3000, // auto-dismiss after 3s
        });
        this.isLoading = false;
      },
    });
  }

  toggleStatus(user: GetAllUsersResponse): void {
    // Dummy method
    user.status = user.suspended ? 'Suspended' : 'Active';
  }
}
