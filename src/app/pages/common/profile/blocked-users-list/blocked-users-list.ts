import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { AvatarModule } from 'primeng/avatar';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { FriendConnectionService, FriendItem, FriendsListApiResponse } from '../../../services/friend-connection-service';
import { CookieService } from '../../../../interceptors/cookie.service';
import { CommonService } from '../../../services/common-service';

@Component({
  selector: 'app-blocked-users-list',
  imports: [CommonModule, RouterModule, PaginatorModule, AvatarModule, ConfirmPopupModule, ToastModule],
  providers: [ConfirmationService],
  templateUrl: './blocked-users-list.html',
  styleUrl: './blocked-users-list.scss',
})
export class BlockedUsersList implements OnInit, OnDestroy {
  private router = inject(Router);
  private friendConnectionService = inject(FriendConnectionService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  private cookieService = inject(CookieService);
  currentUserId = parseInt(this.cookieService.getCookie('userId') || '0', 10);
  private commonService = inject(CommonService);

  loading = signal(false);
  errorMessage = signal('');
  blockedUsers = signal<FriendItem[]>([]);
  avatarCache = signal<Record<number, string>>({});
  unblockedUserIds = signal<Set<number>>(new Set());

  rows = 10;
  first = 0;
  rowsPerPageOptions = [10, 20, 30];

  private imageCache = new Map<string, string>();
  private readonly placeholder = 'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112';

  totalRecords = computed(() => this.blockedUsers().length);
  pagedBlockedUsers = computed(() => this.blockedUsers().slice(this.first, this.first + this.rows));

  ngOnInit(): void {
    this.loadBlockedUsers();
  }

  private loadBlockedUsers(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.friendConnectionService
      .getAllBlockedUsers(this.currentUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: FriendsListApiResponse) => {
          this.loading.set(false);
          this.blockedUsers.set(res?.data);
          res?.data?.forEach((f) => this.resolveAvatar(f));
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Unable to load blockedUsers list right now.');
        }
      });
  }

  private resolveAvatar(f: FriendItem): void {
    if (!f.imageName) return;

    const cached = this.imageCache.get(f.imageName);
    if (cached) {
      this.setAvatar(f.userId, cached);
      return;
    }

    if (this.currentUserId !== null &&
      f.imageName !== '' &&
      f.imageName !== undefined &&
      f.imageName !== null
    ) {
      this.commonService
        .getOtherUserAvatarImage(this.currentUserId, f?.userId) // f.userId = otherUserId
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            this.imageCache.set(f.imageName, url);
            this.setAvatar(f.userId, url);
          },
          error: () => { } // keep placeholder
        });
    } else {
      // do nothing- default image is auto assigned initially ro varx
    }
  }

  private setAvatar(userId: number, url: string): void {
    this.avatarCache.update((map) => ({ ...map, [userId]: url }));
  }

  avatarFor(f: FriendItem): string {
    return this.avatarCache()[f.userId] ?? this.placeholder;
  }

  viewProfile(f: FriendItem): void {
    this.router.navigate(['/users-profile', f.userId]);
  }

  confirmUnblock(event: Event, f: FriendItem): void {
    event.stopPropagation();

    this.confirmationService.confirm({
      target: event.currentTarget as EventTarget,
      message: `Remove ${f.name || f.username} from your blocked Users list?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'unblock', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.unblock(f)
    });
  }

  private unblock(f: FriendItem): void {
    this.unblockedUserIds.update((set) => new Set(set).add(f.userId));

    this.friendConnectionService
      .unBlockUser(this.currentUserId, f.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.blockedUsers.update((items) => items.filter((i) => i.userId !== f.userId));
          // manually remove from unblockedUserIds set after successful unblock- instead of calling getAllBlockedUsers api 
          this.unblockedUserIds.update((set) => {
            const next = new Set(set);
            next.delete(f.userId);
            return next;
          });
          this.messageService.add({ severity: 'success', summary: 'Removed', detail: `${f.name || f.username} removed from blocked Users list.` });
        },
        error: () => {
          this.unblockedUserIds.update((set) => {
            const next = new Set(set);
            next.delete(f.userId);
            return next;
          });
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not remove friend.' });
        }
      });
  }

  isUnblocking(userId: number): boolean {
    return this.unblockedUserIds().has(userId);
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
