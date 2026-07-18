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
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
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
  suspendDialogVisible: boolean = false;
  suspendUserConfirmation: string = '';
  suspendUserId: number | null = null;
  susprndUserStatus: boolean = false;
  suspendErrorMessage: string = '';
  suspendLoading: boolean = false;
  deleteDialogVisible: boolean = false;
  deleteUserConfirmation: string = '';
  deleteUserId: number | null = null;
  deleteUserName: string = '';
  deleteErrorMessage: string = '';
  deleteUserLoading: boolean = false;

  ngOnInit(): void {
    this.loadAllUsers();
  }

  // FrontEnd-Filtering based on search term- so that back /search-user api usage not needed
  get filteredUsers(): GetAllUsersResponse[] {
    // add a "status" property to each user based on the "suspended" property
    this.users.map((user) => {
      user.status = user.suspended ? 'Suspended' : 'Active';
    });
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
          summary: err?.error?.message || 'Error while fetching All Users data',
          detail: 'Try again!',
          life: 3000, // auto-dismiss after 3s
        });
        this.isLoading = false;
      },
    });
  }

  suspendStatus(user: GetAllUsersResponse): void {
    this.suspendDialogVisible = true;
    this.suspendUserId = user.userId;
    this.susprndUserStatus = user.suspended;
  }

  suspendUserHandler(): void {
    if (
      this.suspendUserConfirmation.trim() === 'Suspend-User' ||
      this.suspendUserConfirmation.trim() === 'Activate-User'
    ) {
      if (this.suspendUserId !== null) {
        let suspendValue = this.susprndUserStatus ? 'activate' : 'suspend';
        this.suspendLoading = true;
        // Here this.userId is the Admin-UserId and this.suspendUserId is the userId of the user to be suspended/activated
        this.profileService
          .suspendOrActivateUser(this.userId, this.suspendUserId, suspendValue)
          .subscribe({
            next: (res: string) => {
              this.messageService.add({
                severity: 'success',
                summary: 'User Status',
                detail: res || 'User status updated successfully!',
                life: 3000, // auto-dismiss after 3s
              });
              this.loadAllUsers(); // Refresh the user list after status change
              this.suspendDialogVisible = false; // Close the dialog
              this.suspendUserConfirmation = ''; // Reset confirmation input
              this.suspendLoading = false; // Reset loading state
            },
            error: (err) => {
              console.log('Error while updating user status: ', err);
              this.messageService.add({
                severity: 'error',
                summary:
                  err?.error?.message || 'Error while updating user status',
                detail: 'Try again!',
                life: 3000, // auto-dismiss after 3s
              });
              this.suspendLoading = false; // Reset loading state
            },
          });
      }
    } else {
      this.suspendErrorMessage =
        'Please type "Suspend-User" or "Activate-User" to confirm.';
    }
  }

  deleteUserDialog(user: GetAllUsersResponse): void {
    this.deleteDialogVisible = true;
    this.deleteUserId = user.userId;
    this.deleteUserName = user.username;
  }

  deleteUserHandler(): void {
    if (this.deleteUserConfirmation.trim() === 'Yes-Delete-This-User') {
      if (this.deleteUserId !== null) {
        this.deleteUserLoading = true;
        this.profileService
          .deleteUserById(this.userId, this.deleteUserId)
          .subscribe({
            next: (res) => {
              this.messageService.add({
                severity: 'success',
                summary: 'User Status',
                detail: res || 'User status updated successfully!',
                life: 3000, // auto-dismiss after 3s
              });
              this.loadAllUsers(); // Refresh the user list after user deletion
              this.deleteDialogVisible = false;
              this.deleteUserConfirmation = '';
              this.deleteErrorMessage = '';
              this.deleteUserLoading = false;
            },
            error: (err) => {
              console.log('Error while deleting user data: ', err);
              this.messageService.add({
                severity: 'error',
                summary:
                  err?.error?.message || 'Error while deleting user data',
                detail: 'Try again!',
                life: 3000, // auto-dismiss after 3s
              });
              this.deleteUserLoading = false; // Reset loading state
            },
          });
      }
    } else {
      this.deleteErrorMessage =
        'Please type "Yes-Delete-This-User" to confirm.';
    }
  }
}
