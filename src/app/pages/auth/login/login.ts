import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService, LoginRequest } from '../services/auth';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
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

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
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
    // to log the form values for debugging the flow
    console.log('Form Values: ', this.loginForm.value);

    // client side validation for form inputs before calling API
    // .valid- gives True - if all required validations of each input of form is correct or else False
    if (this.loginForm.valid) {
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
        next: (res: any) => {
          // use AuthResponse type instead of any
          console.log('Login API response: ', res);
          // set True of isLoggedIn signal when user logged IN successfully
          this.authService.setLoggedIn(true);
          // navigate user to login page after successful registration
          this.router.navigate(['']); // path '' = home page
        },
        // error case while calling API
        error: (err: any) => {
          console.log('Error from Register API: ', err);
          // Reset/empty all form input fields if an error occurs while login
          this.loginForm.reset();
          this.errorNotification = {
            show: true,
            type: 'error',
            text: 'Login failed, please try again!',
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
