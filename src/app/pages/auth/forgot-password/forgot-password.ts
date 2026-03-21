import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
// To Handle Spinner animation effect for Loading
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  ChangePasswordRequest,
  ForgotPasswordService,
} from '../services/forgot-password-service';
import { HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterLink,
    FormsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  // common vars
  savedEmail = '';
  isLoading = false;

  // Serive DI
  forgotPasswordService = inject(ForgotPasswordService);
  router = inject(Router);

  // 1st Form- which takes email input
  // And Same email-input value will be used for other 2 form-Api input handling also
  email = new FormControl<string>('', [Validators.email, Validators.required]);
  verifyEmailForm: FormGroup;
  // Based on State var values - 3 form-inputs will be displayed based on conditional Rendering in Template
  state1 = true; // initially email form-input is displayed for 1st-Api handling

  // 2nd form - which takes OTP input(must be 6 digit only)
  otp = new FormControl<string>('', [
    Validators.required,
    Validators.minLength(6),
    Validators.maxLength(6),
  ]);
  verifyOtpForm: FormGroup;
  state2 = false;

  // 3rd Form - which takes password(new) and repeatPassword inputs
  password = new FormControl<string>('', [
    Validators.required,
    Validators.minLength(5),
  ]);
  repeatPassword = new FormControl<string>('', [
    Validators.required,
    Validators.minLength(5),
  ]);
  changePasswordForm: FormGroup;
  state3 = false;

  // this var-object will be used to show error msg from backend if form submission fails
  errorNotification = {
    show: false,
    type: '',
    text: '',
  };

  constructor(private formBuilder: FormBuilder) {
    // bind form controls to form group
    this.verifyEmailForm = this.formBuilder.group({
      // this key must match fields in the backend
      email: this.email,
    });

    this.verifyOtpForm = this.formBuilder.group({
      otp: this.otp,
    });

    this.changePasswordForm = this.formBuilder.group({
      password: this.password,
      repeatPassword: this.repeatPassword,
    });
  }

  // 1st Form handler- no user authentication required
  verifyEmail() {
    // must not have any form validation errors
    if (this.verifyEmailForm.valid) {
      this.isLoading = true;
      this.forgotPasswordService
        .verifyEmailService(this.verifyEmailForm.get('email')?.value)
        .subscribe({
          next: (res: HttpResponse<string>) => {
            this.isLoading = false;
            console.log('res of VerifyEmail= ', res);
            this.savedEmail = this.verifyEmailForm.get('email')?.value;

            // THis custom msg(Already Otp sent...etc) is shown from backend res when user click verify-email multiple times
            console.log('res.status= ', res.status);
            if (res.status == 206) {
              console.log('verifyEmail returned 206');
              this.errorNotification = {
                show: true,
                type: 'partial content',
                text: res.body ?? 'OTP was already sent.',
              };
            }

            // Make State value change
            this.state1 = false;
            this.state2 = true; // now 2nd form will be visible and 1st will not be visible
          },
          error: (err) => {
            this.isLoading = false;
            console.log('error from VerifyEmail= ', err);
            console.log('err status= ', err.status);
            this.errorNotification = {
              show: true,
              type: 'error',
              text: 'Verifying Email failed, please try again!',
            };
          },
        });
    }
  }

  verifyOtp() {
    this.errorNotification.show = false;
    if (this.verifyOtpForm.valid) {
      this.isLoading = true;
      this.forgotPasswordService
        .verifyOtpService(this.verifyOtpForm.get('otp')?.value, this.savedEmail)
        .subscribe({
          next: (res) => {
            this.isLoading = false;
            console.log('res of VerifyOtp= ', res);
            // Make State value change
            this.state2 = false;
            this.state3 = true; // now 3rd form will be visible and 2nd,1st forms will not be visible
          },
          error: (err) => {
            this.isLoading = false;
            console.log('error from VerifyOtp= ', err);
            this.errorNotification = {
              show: true,
              type: 'error',
              text: 'Verifying OTP failed, please try again!',
            };
          },
        });
    }
  }

  changePassword() {
    if (this.changePasswordForm.valid) {
      // create payload/json
      const changePassword: ChangePasswordRequest = {
        password: this.changePasswordForm.get('password')?.value,
        repeatPassword: this.changePasswordForm.get('repeatPassword')?.value,
      };

      // Validation-check- Both password and repeatpassword values must match
      if (changePassword.password != changePassword.repeatPassword) {
        this.errorNotification = {
          show: true,
          type: 'Validation Error',
          text: 'Both Password and RepeatPassword must Match',
        };
        return; // return empty to break function exection after this block where Api call will not happen if both inputs are not same
      }

      this.isLoading = true;
      this.forgotPasswordService
        .changePasswordService(changePassword, this.savedEmail)
        .subscribe({
          next: (res) => {
            this.isLoading = false;
            console.log('res of ChangePassword= ', res);
            this.errorNotification = {
              show: true,
              type: 'success',
              text: 'Password Changed Successfully!',
            };
            // navigate to Login page in success case
            this.router.navigate(['/login']);
          },
          error: (err) => {
            this.isLoading = false;
            console.log('error from ChangePassword= ', err);
            this.errorNotification = {
              show: true,
              type: 'error',
              text: 'Changing Password failed, please try again!',
            };
          },
        });
    }
  }
}
