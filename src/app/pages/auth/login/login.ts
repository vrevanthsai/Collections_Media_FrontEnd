import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthResponse, AuthService, LoginRequest } from '../services/auth';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
//  implementation logic and template is same like register page
export class Login {
  // define form inputs
  email = new FormControl<String>('', [Validators.required, Validators.email]);
  password = new FormControl<String>('', [
    Validators.required,
    Validators.minLength(5),
  ]);

  // create form group to link with <form> in html
  loginForm: FormGroup;

  // this var-object will be used to show error msg from backend if form submission fails
  errorNotification = {
    show: false,
    type: '',
    text: '',
  };
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    // bind form controls to form group
    this.loginForm = this.formBuilder.group({
      // this key must match fields in the backend
      email: this.email,
      password: this.password,
    });
  }

  // function to handle Login form submission
  login() {
    // client side validation for form inputs before calling API
    // .valid- gives True - if all required validations of each input of form is correct or else False
    if (this.loginForm.valid) {
      this.isLoading = true;
      // use Defined Type for building payload to be sent to backend API
      const loginRequest: LoginRequest = {
        // get input values from form controls(ReactiveForm approach)
        // ?. is used to avoid error in case form control value is null or undefined
        email: this.loginForm.get('email')?.value,
        password: this.loginForm.get('password')?.value,
      };

      // calling service- login function
      // subscribe is used to get response from Observable returned by login function in service after API call
      this.authService.login(loginRequest).subscribe({
        // success case
        next: (res: AuthResponse) => {
          // use AuthResponse type instead of any
          console.log('Login API response: ', res);
          // set True of isLoggedIn signal when user logged IN successfully
          this.authService.setLoggedIn(true);
          // set user name in signal variable to show in navbar after login
          this.authService.setName(res?.data?.name);

          // Show Toast notification for successful login
          this.messageService.add({
            severity: 'success',
            summary: 'Login Successful',
            detail: 'Welcome back!',
            life: 3000, // auto-dismiss after 3s
          });
          this.isLoading = false;

          // If login came from a blocked protected route, go back there after success.
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.router.navigateByUrl(returnUrl || '/home');
        },
        // error case while calling API
        error: (err: any) => {
          this.isLoading = false;
          console.log('Error from Login API: ', err);
          // Reset/empty all form input fields if an error occurs while login
          this.loginForm.reset();
          this.errorNotification = {
            show: true,
            type: 'error',
            text: err?.error?.message || 'Login failed, please try again!',
          };
        },
      });
    } else {
      this.errorNotification = {
        show: true,
        type: 'validation',
        text: 'Please fill up all mandatory fields!!!',
      };
    }
  }
}
