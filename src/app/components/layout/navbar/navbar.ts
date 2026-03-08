import { Component, signal, WritableSignal } from '@angular/core';
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
  name = signal<string | null>('');

  //  DI to use authService in a component file and Router DI for navigation
  constructor(private authService: AuthService, private router: Router){}

  // This block runs at first-before all other lines in this component and only runs once when page loads
  ngOnInit():void {
    this.isLoggedIn = this.authService.getLoggedIn();
    this.name.set(this.authService.getName());
    if(this.name()){
      this.name();
    } else {
      this.name.set(sessionStorage.getItem('name'));
    } 
  }

  // Logout feature
  logout(){
    this.authService.logout();
    this.authService.setLoggedIn(false);
    this.router.navigate(['']); // when user loggedOUt then direct navigated to '' path- Intro page
  }

}
