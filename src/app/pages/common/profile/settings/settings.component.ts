import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../../services/theme-service';
import { DialogModule } from 'primeng/dialog';
import { CookieUserDetails, ProfileService } from '../services/profile.service';
import { MessageService } from 'primeng/api';
import { CookieService } from '../../../../interceptors/cookie.service';
import { AuthService } from '../../../auth/services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    ToggleSwitchModule,
    ButtonModule,
    DialogModule,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  themeService = inject(ThemeService);
  profileService = inject(ProfileService);
  messageService = inject(MessageService);
  authService = inject(AuthService);
  router = inject(Router);
  darkMode = true;
  private cookieService = inject(CookieService);
  userId = parseInt(this.cookieService.getCookie('userId') || '0', 10);
  // get userDetails from Cookie if exists
  private userDetails: CookieUserDetails = JSON.parse(
    this.cookieService.getCookie('userDetails') || '{}',
  );
  // Delete Accountt vars
  deleteDialogVisible: boolean = false;
  deleteUserConfirmation: string = '';
  deleteUserName: string = '';
  deleteErrorMessage: string = '';
  deleteUserLoading: boolean = false;

  ngOnInit() {
    this.darkMode = this.themeService.isDarkMode();
  }

  saveSettings() {
    console.log('darkmode ', this.darkMode);
    this.themeService.setTheme(this.darkMode);
  }

  deleteMyAccountDialog(): void {
    this.deleteDialogVisible = true;
    this.deleteUserName = this.userDetails?.username;
  }

  deleteMyAccountHandler(): void {
    if (this.deleteUserConfirmation.trim() === 'Yes-Delete-My-Account') {
      if (this.userId !== null) {
        this.deleteUserLoading = true;
        this.profileService
          .deleteMyAccountById(this.userId)
          .subscribe({
            next: (res) => {
              // Send Deleted user back to '' root-path(intro_page) with logout of his stored data in his browser
              this.authService.logout();
              this.authService.setLoggedIn(false);
              this.router.navigate(['']);
              this.messageService.add({
                severity: 'success',
                summary: 'User Status',
                detail: res || 'your Account Deleted successfully!',
                life: 3000, // auto-dismiss after 3s
              });
              this.deleteDialogVisible = false;
              this.deleteUserConfirmation = '';
              this.deleteErrorMessage = '';
              this.deleteUserLoading = false;
            },
            error: (err) => {
              console.log('Error while deleting your Account data: ', err);
              this.messageService.add({
                severity: 'error',
                summary:
                  err?.error?.message || 'Error while deleting your Account data',
                detail: 'Try again!',
                life: 3000, // auto-dismiss after 3s
              });
              this.deleteUserLoading = false; // Reset loading state
            },
          });
      }
    } else {
      this.deleteErrorMessage =
        'Please type "Yes-Delete-My-Account" to confirm.';
    }
  }
}
