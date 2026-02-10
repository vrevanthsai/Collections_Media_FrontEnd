import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

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
  constructor(private formBuilder: FormBuilder){
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
    console.log(this.registerForm.value);
  }
}
