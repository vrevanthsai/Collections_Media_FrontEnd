import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../pages/auth/services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, CommonModule, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {

  // signal var user for knowing User state
  isLoggedIn = signal<boolean>(false);
  // get user info from sessionStorage which is stored after user logged-In(or login-service-method)
  name = signal<string | null>(sessionStorage.getItem('name'));

  //  DI to use authService in a component file and Router DI for navigation
  constructor(private authService: AuthService, private router: Router){}

  // This block runs at first-before all other lines in this component and only runs once when page loads
  ngOnInit():void {
    this.isLoggedIn = this.authService.getLoggedIn();
    this.name = this.authService.getName();
  }

  // Logout feature
  logout(){
    this.authService.logout();
    this.authService.setLoggedIn(false);
    this.router.navigate(['']); // when user loggedOUt then direct navigated to '' path- Intro page
  }

  isAdmin(): boolean {
    // if stored Role has ADMIN value then returns True or else False(USER)
    return this.authService.hasRole('ADMIN');
  }

}
