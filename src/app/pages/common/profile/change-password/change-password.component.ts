import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ChangePasswordRequest, ProfileService } from '../services/profile.service';
import { CookieService } from '../../../../interceptors/cookie.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword
    ? { mismatch: true }
    : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PasswordModule, ButtonModule, ToastModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
  providers: [MessageService]
})
export class ChangePasswordComponent {
  form: FormGroup;
  saving = false;
  private cookieService = inject(CookieService);
  userId = parseInt(this.cookieService.getCookie('userId') || '0', 10);

  constructor(private fb: FormBuilder, private messageService: MessageService, private profileService: ProfileService) {
    this.form = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(5)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: passwordsMatch }
    );
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const changePwdRequest: ChangePasswordRequest = {
      oldPwd: this.form.value.currentPassword,
      newPwd: this.form.value.newPassword
    };
    
    this.saving = true;
    this.profileService.changePassword(this.userId, changePwdRequest).subscribe({
      next: (response) => {
        this.saving = false;
        if (response.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Password changed',
            detail: response.message || 'Your password has been updated.'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: response.message || 'Failed to change password.'
          });
        }
        this.form.reset();
      },
      error: (error) => {
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'An error occurred while changing the password.'
        });
      }
    });
  }
}
