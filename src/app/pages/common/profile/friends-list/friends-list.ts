import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { AvatarModule } from 'primeng/avatar';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { CollectionsService } from '../../../services/collections-service';
import { FriendConnectionService, FriendItem } from '../../../services/friend-connection-service';
import { CookieService } from '../../../../interceptors/cookie.service';
import { CommonService } from '../../../services/common-service';

@Component({
  selector: 'app-friends-list',
  imports: [CommonModule, RouterModule, PaginatorModule, AvatarModule, ConfirmPopupModule, ToastModule],
  providers: [ConfirmationService],
  templateUrl: './friends-list.html',
  styleUrl: './friends-list.scss',
})
export class FriendsList implements OnInit, OnDestroy {
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
  friends = signal<FriendItem[]>([]);
  avatarCache = signal<Record<number, string>>({});
  unfriendingIds = signal<Set<number>>(new Set());

  rows = 10;
  first = 0;
  rowsPerPageOptions = [10, 20, 30];

  private imageCache = new Map<string, string>();
  private readonly placeholder = 'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112';

  totalRecords = computed(() => this.friends().length);
  pagedFriends = computed(() => this.friends().slice(this.first, this.first + this.rows));

  ngOnInit(): void {
    this.loadFriends();
  }

  private loadFriends(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.friendConnectionService
      .getAllFriends(this.currentUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.loading.set(false);
          this.friends.set(items);
          items.forEach((f) => this.resolveAvatar(f));
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Unable to load friends list right now.');
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

  confirmUnfriend(event: Event, f: FriendItem): void {
    event.stopPropagation();

    this.confirmationService.confirm({
      target: event.currentTarget as EventTarget,
      message: `Remove ${f.name || f.username} from your friends?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Unfriend', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.unfriend(f)
    });
  }

  private unfriend(f: FriendItem): void {
    this.unfriendingIds.update((set) => new Set(set).add(f.userId));

    this.friendConnectionService
      .unfriend(this.currentUserId, f.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.friends.update((items) => items.filter((i) => i.userId !== f.userId));
          // manually remove from unfriendingIds set after successful unfriend- instead of calling getAllFriends api 
          this.unfriendingIds.update((set) => {
            const next = new Set(set);
            next.delete(f.userId);
            return next;
          });
          this.messageService.add({ severity: 'success', summary: 'Removed', detail: `${f.name || f.username} removed from friends.` });
        },
        error: () => {
          this.unfriendingIds.update((set) => {
            const next = new Set(set);
            next.delete(f.userId);
            return next;
          });
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not remove friend.' });
        }
      });
  }

  isUnfriending(userId: number): boolean {
    return this.unfriendingIds().has(userId);
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
