import { Routes } from '@angular/router';
import { adminGuard } from '../../../components/layout/guards/admin-guard';

/**
 * Standalone routes for the profile feature area.
 * Every component is loaded lazily via loadComponent — no NgModule needed.
 */
export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./profile-layout/profile-layout.component').then((m) => m.ProfileLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profile' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./profile-info/profile-info.component').then((m) => m.ProfileInfoComponent)
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent
          )
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./notifications/notifications.component').then((m) => m.NotificationsComponent)
      },
      {
        path: 'friends-list',
        loadComponent: () =>
          import('./friends-list/friends-list').then((m) => m.FriendsList)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/settings.component').then((m) => m.SettingsComponent)
      },
      {
        path: 'user-management',
        loadComponent: () =>
          import('./user-management/user-management.component').then(
            (m) => m.UserManagementComponent
          ),
        canActivate: [adminGuard]
      }
    ]
  }
];
