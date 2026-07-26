import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../pages/auth/services/auth';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { CookieService } from '../../../interceptors/cookie.service';
import { ProfileService } from '../../../pages/common/profile/services/profile.service';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    CommonModule,
    RouterLinkActive,
    FormsModule,
    AvatarModule,
    OverlayBadgeModule,
    InputText,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private cookieService = inject(CookieService);
  // signal var user for knowing User state
  isLoggedIn = signal<boolean>(false);
  // get user info from cookie which is stored after user logged-In(or login-service-method)
  private userDetails = JSON.parse(
    this.cookieService.getCookie('userDetails') || '{}',
  );
  name = signal<string | null>(this.userDetails.name || null);
  searchTerm = '';
  unreadCount = signal(3); // wire this up to your notifications service
  avatarUrl = signal<string | undefined>(undefined);
  allowImageLoad = true; // flag to control image loading
  userId = parseInt(this.cookieService.getCookie('userId') || '0', 10);

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

    // Receive updated avatar URL if exists from ProfileService and update the user signal and only called when Usser updates his profile
    this.profileService.sharedAvatarBlobData$.subscribe(
      (avatarBlob: Blob | undefined) => {
        if (avatarBlob) {
          const reader = new FileReader();
          reader.onload = () => {
            this.resizeImage(avatarBlob, 256).then((resizedDataUrl) => {
              this.avatarUrl.set(resizedDataUrl);
            });
          };
          reader.readAsDataURL(avatarBlob);

          this.allowImageLoad = false; // we already have the updated avatar, so no need to load it again from backend twice
        }
      },
    );

    // Load user avatar image from backend if exists
    if (this.allowImageLoad) {
      this.loadUserAvatarImage();
    }
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

  onSearch(): void {
    if (!this.searchTerm.trim()) return;
    this.router.navigate(['/search'], {
      queryParams: { q: this.searchTerm.trim() },
    });
  }

  // Load User Avatar
  loadUserAvatarImage(): void {
    this.userDetails = JSON.parse(
      this.cookieService.getCookie('userDetails') || '{}',
    );
    if (
      this.userDetails?.avatarName !== '' &&
      this.userDetails?.avatarName !== undefined &&
      this.userDetails?.avatarName !== null
    ) {
      this.profileService.getUserAvatarImage(this.userId).subscribe({
        next: (imageBlob: Blob) => {
          this.resizeImage(imageBlob, 256).then((resizedDataUrl) => {
            this.avatarUrl.set(resizedDataUrl);
          });
          this.profileService.updateAvatarBlobData(imageBlob);
        },
        error: (err: any) => {
          console.log('Error while fetching User Avatar Image: ', err);
          this.messageService.add({
            severity: 'error',
            summary:
              err?.error?.message || 'Error while fetching User Avatar Image',
            detail: 'Try again!',
            life: 3000, // auto-dismiss after 3s
          });
        },
      });
    } else {
      // If no avatar image is uploaded, use a default avatar image
      this.avatarUrl.set(
        'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112',
      );
    }
  }

  // Method used for resizing avatar/image to fit small sized icon
  private resizeImage(file: Blob, maxSize = 256): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // scale down proportionally so neither dimension exceeds maxSize
          if (width > height && width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          } else if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', 0.85)); // resized, compressed base64
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
