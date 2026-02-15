import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, RegisterRequest } from '../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [ ReactiveFormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {

  // define form inputs
  name = new FormControl<String>('', [Validators.required]);
  email = new FormControl<String>('', [Validators.required, Validators.email]);
  username = new FormControl<String>('', [Validators.required]);
  password = new FormControl<String>('', [Validators.required, Validators.minLength(5)]);

  // create form group to link with <form> in html
  registerForm: FormGroup;

  // this var-object will be used to show error msg from backend if form submission fails
  errorNotification = {
    show: false,
    type: '',
    text: ''
  }

  // do Dependency Injection for FormBuilder and create form group
  // DI for AuthService to call API integration functions
  // Router DI to navigate user to login page after successful registration
  constructor( private formBuilder: FormBuilder, 
    private authService: AuthService,
    private router: Router
  ){
    // bind form controls to form group
    this.registerForm = this.formBuilder.group({
      // this key must match fields in the backend
      name: this.name,
      email: this.email,
      username: this.username,
      password: this.password
    });
  }

  // function to handle Register form submission
  register(){
    // to log the form values for debugging the flow
    console.log("Form Values: ", this.registerForm.value);

    // use Defined Type for building payload to be sent to backend API
    const registerRequest: RegisterRequest = {
      // get input values from form controls(ReactiveForm approach)
      // ?. is used to avoid error in case form control value is null or undefined
      name: this.registerForm.get('name')?.value,
      email: this.registerForm.get('email')?.value,
      username: this.registerForm.get('username')?.value,
      password: this.registerForm.get('password')?.value,
    } 

    // Todo- add client side validation for form inputs before calling API

    // calling service- register function
    // subscribe is used to get response from Observable returned by register function in service after API call
    this.authService.register(registerRequest).subscribe({
      // success case
      next: (res: any) => { // use AuthResponse type instead of any
        console.log("Register API response: ", res);
        // navigate user to login page after successful registration
        this.router.navigate(['login']);
      },
      // error case while calling API
      error: (err: any) => {
        console.log("Error from Register API: ", err);
      }
    })

  }
}
