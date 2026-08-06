import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { AvatarModule } from 'primeng/avatar';
import { CommonService, UserProfileCollection, UserProfileUser } from '../../services/common-service';
import { CookieService } from '../../../interceptors/cookie.service';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { CheckFriendConnectionResponse, FriendConnectionDto, FriendConnectionService, FriendResquestResponse } from '../../services/friend-connection-service';


@Component({
  selector: 'app-user-profile-view',
  imports: [CommonModule, RouterModule, PaginatorModule, AvatarModule, ButtonModule],
  templateUrl: './user-profile-view.html',
  styleUrl: './user-profile-view.scss',
})
export class UserProfileView implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private commonService = inject(CommonService);
  private destroyRef = inject(DestroyRef);
  private cookieService = inject(CookieService);
  private messageService = inject(MessageService);
  private friendConnectionService = inject(FriendConnectionService);

  currentUserId = parseInt(this.cookieService.getCookie('userId') || '0', 10);

  loading = signal(false);
  errorMessage = signal('');
  user = signal<UserProfileUser | null>(null);
  collections = signal<UserProfileCollection[]>([]);
  avatarUrl = signal<string>('https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112');

  rows = 8;
  first = 0;
  rowsPerPageOptions = [8, 16, 24];

  private imageCache = new Map<string, string>();

  pagedCollections = computed(() => this.collections().slice(this.first, this.first + this.rows));
  totalRecords = computed(() => this.collections().length);
  isFriendRequestSent = signal(false);
  friendConnectionData = signal<FriendConnectionDto | null>(null);
  friendButtonLabel: string = "Friend Request";

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = Number(params.get('userId'));
        this.first = 0;

        if (!Number.isInteger(id) || id <= 0) {
          this.errorMessage.set('This profile link is invalid.');
          return;
        }
        this.loadUserProfile(id);
      });
  }

  private loadUserProfile(viewUserId: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.commonService
      .getUserProfileView(this.currentUserId, viewUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ user, collections }) => {
          this.loading.set(false);
          this.user.set(user);
          this.collections.set(collections);
          if (user.imageName) {
            this.resolveAvatar(user.imageName, this.currentUserId, user.userId);
          }
          // Check friend connection status between current user and viewed user
          this.checkFriendRequestStatus();
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Unable to load this profile right now.');
        }
      });
  }

  private resolveAvatar(imageName: string, currentId: number,
    otherUserId: number): void {
    const cached = this.imageCache.get(imageName);
    if (cached) {
      this.avatarUrl.set(cached);
      return;
    }
    if (
      currentId !== null &&
      imageName !== '' &&
      imageName !== undefined &&
      imageName !== null
    ) {
      this.commonService
        .getOtherUserAvatarImage(currentId, otherUserId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            this.imageCache.set(imageName, url);
            this.avatarUrl.set(url);
          },
          error: () => { } // keep placeholder
        });
    } else {
      // If no avatar image is uploaded, use a default avatar image
      // do nothing - already avatarUrl var has default img/avatar value/path
    }
  }

  onPageChange(event: PaginatorState): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  globalIndex(localIndex: number): number {
    return this.first + localIndex + 1;
  }

  statusClass(progress: string): string {
    const key = (progress || '').toLowerCase();
    if (key === 'completed') return 'status-pill--completed';
    if (['watching', 'reading', 'playing', 'in progress'].includes(key)) return 'status-pill--progress';
    if (key === 'dropped') return 'status-pill--dropped';
    return 'status-pill--planned';
  }

  starArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }

  goToCollection(collectionId: number): void {
    this.router.navigate(['/collections', collectionId]);
  }

  ngOnDestroy(): void {
    this.imageCache.forEach((url) => URL.revokeObjectURL(url));
    this.imageCache.clear();
    this.isFriendRequestSent.set(false);
    this.friendButtonLabel = "Friend Request"; // reset
  }

  // Send Friend Request Method
  sendFriendRequest() {
    this.friendButtonLabel = "Loading..."
    this.friendConnectionService.sendFriendRequest(this.currentUserId, this.user()?.userId).subscribe({
      next: (res: FriendResquestResponse) => {
        this.isFriendRequestSent.set(true);
        this.friendButtonLabel = "Request Sent";
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: res?.data || 'Friend Request Sent successfully',
          life: 3000, // auto-dismiss after 3s
        });
      },
      error: (err) => {
        console.error('Error while sending friend request:', err);
        this.friendButtonLabel = "Friend Request"; // reset
        this.messageService.add({
          severity: 'error',
          summary:
            err?.error?.message || 'Error while sending friend request',
          detail: 'Try again!',
          life: 3000, // auto-dismiss after 3s
        });
      }
    })
  }

  checkFriendRequestStatus() {
    this.friendConnectionService.checkFriendConnection(this.currentUserId, this.user()?.userId).subscribe({
      next: (res: CheckFriendConnectionResponse) => {
        this.friendConnectionData.set(res?.data);
        if (res?.data?.status === 'PENDING') {
          this.isFriendRequestSent.set(true);
          this.friendButtonLabel = "Request Sent";
        } else if (res?.data?.status === 'ACCEPTED') {
          this.isFriendRequestSent.set(true);
          this.friendButtonLabel = "Friends";
        }
      },
      error: (err) => {
        console.error('Error while checking friend connection between 2 users :', err);
        this.messageService.add({
          severity: 'error',
          summary:
            err?.error?.message || 'Error while checking friend connection between 2 users',
          detail: 'Try again!',
          life: 3000, // auto-dismiss after 3s
        });
      }
    })
  }

  friendRequestAction(action: 'ACCEPTED' | 'REJECTED') {
    const connectionId = this.friendConnectionData()?.connectionId;
    if (connectionId !== null && connectionId !== undefined) {
      this.friendButtonLabel = "Loading..."
      this.friendConnectionService.friendRequestAction(this.currentUserId, connectionId, action).subscribe({
        next: (res: FriendResquestResponse) => {
          if (action === 'ACCEPTED') {
            // Manually-Frontend update status to "ACCEPTED" instead of calling checkFriendRequestStatus() method to call api to check updated status
            // this is how signal-object-item value is done by using arrow function
            this.friendConnectionData.update((current) =>
              current ? { ...current, status: 'ACCEPTED' } : current
            );
            this.isFriendRequestSent.set(true);
            this.friendButtonLabel = "Friends";
          } else if (action === 'REJECTED') {
            this.friendConnectionData.update((current) =>
              current ? { ...current, status: 'REJECTED' } : current
            );
            this.isFriendRequestSent.set(false);
            this.friendButtonLabel = "Friend Request"; // reset
          } else {
            this.isFriendRequestSent.set(false);
            this.friendButtonLabel = "Friend Request"; // reset
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: res?.data || 'Friend Request processed successfully',
            life: 3000, // auto-dismiss after 3s
          });
        },
        error: (err) => {
          console.error('Error while checking friend connection between 2 users :', err);
          this.friendButtonLabel = "Friend Request"; // reset
          this.messageService.add({
            severity: 'error',
            summary:
              err?.error?.message || 'Error while checking friend connection between 2 users',
            detail: 'Try again!',
            life: 3000, // auto-dismiss after 3s
          });
        }
      })
    } else {
      this.messageService.add({
        severity: 'error',
        summary:
          'Connection ID is required to respond to friend request!!',
        detail: 'Try again!',
        life: 3000, // auto-dismiss after 3s
      });
    }
  }

  blockUser() {

  }
}
