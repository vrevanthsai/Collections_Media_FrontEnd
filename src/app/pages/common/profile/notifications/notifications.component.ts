import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, ToggleSwitchModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent {
  prefs: NotificationPref[] = [
    {
      key: 'new-episode',
      label: 'New Episode Alerts',
      description: 'Get notified when a new episode of something in your watch list airs.',
      enabled: true
    },
    {
      key: 'recommendations',
      label: 'Recommendations',
      description: 'Weekly picks based on what you have been watching.',
      enabled: true
    },
    {
      key: 'comments',
      label: 'Comment Replies',
      description: 'Someone replied to your comment or review.',
      enabled: false
    },
    {
      key: 'announcements',
      label: 'Product Announcements',
      description: 'News about new features and site updates.',
      enabled: false
    }
  ];
}
