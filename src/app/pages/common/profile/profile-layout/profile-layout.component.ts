import { Component, computed, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TabsModule } from 'primeng/tabs';
import { AvatarModule } from 'primeng/avatar';
import { AppUser, ProfileService } from '../services/profile.service';

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
  styleUrls: ['./profile-layout.component.scss']
})
export class ProfileLayoutComponent implements OnInit {
  user!: Signal<AppUser>; // Reactive signal - updates automatically
  navItems: NavItem[] = [];
  activeTab = 'profile';

  constructor(private router: Router, private profileService: ProfileService) {}

  ngOnInit(): void {
    this.user = this.profileService?.currentUser; // Get the signal, not the value
    this.buildNav();

    // Keep the active tab in sync if the URL changes some other way
    // (browser back/forward, direct link, redirect from the admin guard, etc.)
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.syncActiveTab());

    this.syncActiveTab();

    if(this.profileService?.reAssignUserDetails) {
      this.user = this.profileService?.currentUser; // Get the signal, not the value
    }
  }


  private buildNav(): void {
    this.navItems = [
      { label: 'Profile', icon: 'pi pi-user', path: 'profile' },
      { label: 'Change Password', icon: 'pi pi-key', path: 'change-password' },
      { label: 'Notifications', icon: 'pi pi-bell', path: 'notifications' },
      { label: 'Friends List', icon: 'pi pi-bell', path: 'friends-list' },
      { label: 'Settings', icon: 'pi pi-cog', path: 'settings' },
      ...(this.profileService.isAdmin()
        ? [{ label: 'User Management', icon: 'pi pi-users', path: 'user-management' }] // if Admin then access it or not
        : [])
    ];
  }

  private syncActiveTab(): void {
    const segment = this.router.url.split('/').filter(Boolean).pop();
    if (segment) {
      this.activeTab = segment;
    }
  }
}
