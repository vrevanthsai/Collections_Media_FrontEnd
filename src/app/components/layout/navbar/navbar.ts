import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../pages/auth/services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {

  // signal var user for knowing User state
  isLoggedIn = signal<boolean>(false);
  // get user info from sessionStorage which is stored after user logged-In(or login-service-method)
  // HERE- order of name var is important - it should come after above isLoggedIn signal var which helps in displaying User-Name properly in Navbar after user loggedIN for first time
  // or use name signal-var and assign its value in login() of login.component
  name: string | null = sessionStorage.getItem('name');
  // name = signal<string | null>(''); 

  //  DI to use authService in a component file and Router DI for navigation
  constructor(private authService: AuthService, private router: Router){}

  // This block runs at first-before all other lines in this component and only runs once when page loads
  ngOnInit():void {
    this.isLoggedIn = this.authService.getLoggedIn();
    // this.name.set(sessionStorage.getItem('name')); 
  }

  // Logout feature
  logout(){
    this.authService.logout();
    this.authService.setLoggedIn(false);
    this.router.navigate(['login']); // when user loggedOUt then direct navigated to /login path
  }

}
