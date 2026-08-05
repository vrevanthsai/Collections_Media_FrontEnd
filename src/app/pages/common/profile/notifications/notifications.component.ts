import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { AvatarModule } from 'primeng/avatar';
import { NotificationItem, NotificationsService } from '../../../services/notifications-service';
import { CollectionsService } from '../../../services/collections-service';
import { CookieService } from '../../../../interceptors/cookie.service';
import { CommonService } from '../../../services/common-service';

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginatorModule, AvatarModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private notifcationsService = inject(NotificationsService);
  private destroyRef = inject(DestroyRef);
  private commonService = inject(CommonService)

  loading = signal(false);
  errorMessage = signal('');
  notifications = signal<NotificationItem[]>([]);
  avatarCache = signal<Record<number, string>>({});

  rows = 10;
  first = 0;
  rowsPerPageOptions = [10, 20, 30];

  private imageCache = new Map<string, string>();
  private readonly placeholder = 'https://placehold.co/100x100?text=%20';
  private cookieService = inject(CookieService);

  currentUserId = parseInt(this.cookieService.getCookie('userId') || '0', 10);

  totalRecords = computed(() => this.notifications().length);
  // Auto update the unreadCount whenever the notifications signal changes. This is done using a computed signal that filters the notifications for those that are unread (read === false) and returns the count of such notifications.
  unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);
  pagedNotifications = computed(() =>
    this.notifications().slice(this.first, this.first + this.rows)
  );

  ngOnInit(): void {
    this.loadNotifications();
  }

  private loadNotifications(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.notifcationsService
      .getAllNotifications(this.currentUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.loading.set(false);
          const sorted = [...items].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          // All notifications data with sorted in desending order to show latest notification first. And then set to the signal.
          this.notifications.set(sorted);
          sorted.forEach((n) => this.resolveAvatar(n));
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Unable to load notifications right now.');
        }
      });
  }

  private resolveAvatar(n: NotificationItem): void {
    if (!n.actorImageName) return;

    const cached = this.imageCache.get(n.actorImageName);
    if (cached) {
      this.setAvatar(n.id, cached);
      return;
    }

    if (this.currentUserId !== null &&
      n.actorImageName !== '' &&
      n.actorImageName !== undefined &&
      n.actorImageName !== null
    ) {
      this.commonService
        .getOtherUserAvatarImage(this.currentUserId, n.actorUserId) // actorUserId = otherUserId
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            this.imageCache.set(n.actorImageName, url);
            this.setAvatar(n.id, url);
          },
          error: () => { } // keep placeholder
        });
    } else {
      // do nothing- default image is auto assigned initially ro varx
    }

  }

  private setAvatar(notificationId: number, url: string): void {
    this.avatarCache.update((map) => ({ ...map, [notificationId]: url }));
  }

  avatarFor(n: NotificationItem): string {
    return this.avatarCache()[n.id] ?? this.placeholder;
  }

  typeConfig(type: string): NotificationTypeConfig {
    return NOTIFICATION_TYPE_MAP[type] ?? DEFAULT_TYPE_CONFIG;
  }

  timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  onNotificationClick(n: NotificationItem): void {
    if (!n.read) {
      this.notifications.update((items) =>
        items.map((i) => (i.id === n.id ? { ...i, read: true } : i))
      );
      // TODO: call your mark-as-read endpoint here once it exists, e.g.
      // this.commonService.markNotificationRead(this.currentUserId, n.id).subscribe();
    }

    const config = this.typeConfig(n.type);
    if (config.buildLink) {
      this.router.navigate(config.buildLink(n) as any[]);
    }
  }

  markAllAsRead(): void {
    this.notifications.update((items) => items.map((i) => ({ ...i, read: true })));
    // TODO: call a bulk mark-all-read endpoint here once it exists
  }

  onPageChange(event: PaginatorState): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnDestroy(): void {
    this.imageCache.forEach((url) => URL.revokeObjectURL(url));
    this.imageCache.clear();
  }
}


interface NotificationTypeConfig {
  icon: string;
  colorClass: string;
  buildMessage: (n: NotificationItem) => string;
  buildLink?: (n: NotificationItem) => unknown[];
}

const NOTIFICATION_TYPE_MAP: Record<string, NotificationTypeConfig> = {
  FRIEND_ACCEPTED: {
    icon: 'pi pi-user-plus',
    colorClass: 'notif-icon--friend',
    buildMessage: (n) => `accepted your friend request`,
    buildLink: (n) => ['/users-profile', n.actorUserId]
  },
  FRIEND_REQUEST: {
    icon: 'pi pi-user-plus',
    colorClass: 'notif-icon--friend',
    buildMessage: (n) => `sent you a friend request`,
    buildLink: (n) => ['/users-profile', n.actorUserId]
  },
  COLLECTION_LIKE: {
    icon: 'pi pi-heart-fill',
    colorClass: 'notif-icon--like',
    buildMessage: (n) => `liked your collection`,
    buildLink: (n) => ['/collections', n.referenceId]
  },
};

const DEFAULT_TYPE_CONFIG: NotificationTypeConfig = {
  icon: 'pi pi-bell',
  colorClass: 'notif-icon--default',
  buildMessage: () => `sent you a notification`
};
