import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TabsModule } from 'primeng/tabs';
import { AvatarModule } from 'primeng/avatar';
import { CookieUserDetails, ProfileService } from '../services/profile.service';
import { CookieService } from '../../../../interceptors/cookie.service';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-profile-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TabsModule, AvatarModule],
  templateUrl: './profile-layout.component.html',
  styleUrls: ['./profile-layout.component.scss'],
})
export class ProfileLayoutComponent implements OnInit {
  private cookieService = inject(CookieService);
  navItems: NavItem[] = [];
  activeTab = 'profile';
  // get userDetails from Cookie if exists
  private userDetails: CookieUserDetails = JSON.parse(
    this.cookieService.getCookie('userDetails') || '{}',
  );
  user = signal<LayoutUserDetails>({
    username: this.userDetails?.username || '',
    role: this.cookieService.getCookie('role') || 'USER',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112', // default avatar img
  });
  // add all-3 subscription to a single subs var and unsubscribe it in ngOnDestroy() to prevent memory leaks when user navigates to other pages and this component is destroyed
  private subs = new Subscription();
  userId = parseInt(this.cookieService.getCookie('userId') || '0', 10);
  allowImageLoad = true; // flag to control image loading

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.buildNav();

    // Keep the active tab in sync if the URL changes some other way
    // (browser back/forward, direct link, redirect from the admin guard, etc.)
    // Keep the active tab in sync if the URL changes some other way
    this.subs.add(
      this.router.events
        .pipe(
          filter(
            (event): event is NavigationEnd => event instanceof NavigationEnd,
          ),
        )
        .subscribe(() => this.syncActiveTab()),
    );

    this.syncActiveTab();

    // Receive updated user details from ProfileService and update the user signal
    // and it will only trigger when the user details are updated in the ProfileInfoComponent
    // Receive updated user details from ProfileService and update the user signal
    this.subs.add(
      this.profileService.sharedData$.subscribe((updatedUser) => {
        if (updatedUser) {
          this.user.set({
            username: updatedUser.username,
            role: updatedUser.role,
            avatarUrl: updatedUser.avatarUrl,
          });
        }
      }),
    );

    // Receive updated avatar URL if exists from ProfileService and update the user signal
    this.subs.add(
      this.profileService.sharedAvatarBlobData$.subscribe(
        (avatarBlob: Blob | undefined) => {
          if (avatarBlob) {
            this.resizeImage(avatarBlob, 256).then((resizedDataUrl) => {
              this.user.update((u) => ({ ...u, avatarUrl: resizedDataUrl }));
            });
            this.allowImageLoad = false; // we already have the updated avatar, so no need to load it again from backend twice
          }
        },
      ),
    );

    // Load user avatar image from backend if exists
    if (this.allowImageLoad) {
      this.loadUserAvatarImage();
    }
  }

  ngOnDestroy(): void {
    // Unsubscribe/clear data from the sharedData$ in service file observable to prevent memory leaks in this component when user navigates to other pages and this component is destroyed
    this.subs.unsubscribe(); // unsubscribes all three at once
    this.profileService.clearProfileState(); // reset profile state on component destruction
  }

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
            this.user.update((u) => ({ ...u, avatarUrl: resizedDataUrl }));
          });
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
      this.user().avatarUrl =
        'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112';
    }
  }

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

  private buildNav(): void {
    this.navItems = [
      { label: 'Profile', icon: 'pi pi-user', path: 'profile' },
      { label: 'Change Password', icon: 'pi pi-key', path: 'change-password' },
      { label: 'Notifications', icon: 'pi pi-bell', path: 'notifications' },
      { label: 'Friends List', icon: 'pi pi-bell', path: 'friends-list' },
      { label: 'Settings', icon: 'pi pi-cog', path: 'settings' },
      ...(this.profileService.isAdmin()
        ? [
            {
              label: 'User Management',
              icon: 'pi pi-users',
              path: 'user-management',
            },
          ] // if Admin then access it or not
        : []),
    ];
  }

  private syncActiveTab(): void {
    const segment = this.router.url.split('/').filter(Boolean).pop();
    if (segment) {
      this.activeTab = segment;
    }
  }
}

type LayoutUserDetails = {
  username: string;
  role: string;
  avatarUrl: string | undefined;
};
