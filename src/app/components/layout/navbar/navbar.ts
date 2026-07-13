import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../pages/auth/services/auth';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { CookieService } from '../../../interceptors/cookie.service';
import { ProfileService } from '../../../pages/common/profile/services/profile.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, CommonModule, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private cookieService = inject(CookieService);
  // signal var user for knowing User state
  isLoggedIn = signal<boolean>(false);
  // get user info from cookie which is stored after user logged-In(or login-service-method)
  private userDetails = JSON.parse(this.cookieService.getCookie('userDetails') || '{}');
  name = signal<string | null>(this.userDetails.name || null);

  //  DI to use authService in a component file and Router DI for navigation
  constructor(
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService,
    private profileService: ProfileService,
  ) {}

  // This block runs at first-before all other lines in this component and only runs once when page loads
  ngOnInit(): void {
    this.isLoggedIn = this.authService.getLoggedIn();
    this.name = this.authService.getName();

    // Receive updated user details from ProfileService and update the user signal 
    // and it will only trigger when the user details are updated in the ProfileInfoComponent
    this.profileService.sharedData$.subscribe((updatedUser) => {
      if (updatedUser) {
        this.name.set(updatedUser.name || null);
      }
    });
  }

  // Logout feature
  logout() {
    this.authService.logout();
    this.authService.setLoggedIn(false);
    // Show Toast notification for successful registration
    this.messageService.add({
      severity: 'success',
      summary: 'Logout Successful!',
      detail: 'Please come back again!',
      life: 4000, // auto-dismiss after 3s
    });
    this.router.navigate(['']); // when user loggedOUt then direct navigated to '' path- Intro page
  }

  isAdmin(): boolean {
    // if stored Role has ADMIN value then returns True or else False(USER)
    return this.authService.hasRole('ADMIN');
  }
}
