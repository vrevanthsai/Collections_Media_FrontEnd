import { TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CookieService } from '../../interceptors/cookie.service';
import { FriendConnectionService, FriendItem } from '../../pages/services/friend-connection-service';
import { ShareCollectionService, ShareCollectionsResponse } from '../../pages/services/share-collection-service';

@Component({
  selector: 'app-share-collections-dialog',
  imports: [FormsModule, TitleCasePipe, CheckboxModule, DialogModule, ProgressSpinnerModule],
  templateUrl: './share-collections-dialog.html',
  styleUrl: './share-collections-dialog.scss',
})
export class ShareCollectionsDialogComponent implements OnChanges {
  readonly maxFriendsPerShare = 5; // to prevent spamming from one user to other users
  @Input() visible = false;
  @Input() collectionIds: number[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() shareCompleted = new EventEmitter<number[]>();

  private readonly cookieService = inject(CookieService);
  private readonly friendConnectionService = inject(FriendConnectionService);
  private readonly shareCollectionService = inject(ShareCollectionService);
  private readonly messageService = inject(MessageService);

  selectedFriendIds = new Set<number>();
  friends: FriendItem[] = [];
  friendsLoading = false;
  sharing = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue && !changes['visible'].previousValue) {
      this.selectedFriendIds = new Set<number>();
      this.loadFriends();
    }
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onDialogVisibleChange(visible: boolean): void {
    if (!visible) this.close();
  }

  toggleFriendSelection(friend: FriendItem): void {
    const next = new Set(this.selectedFriendIds);
    if (next.has(friend.userId)) {
      next.delete(friend.userId);
    } else if (next.size < this.maxFriendsPerShare) {
      next.add(friend.userId);
    } else {
      return;
    }
    this.selectedFriendIds = next;
  }

  isFriendSelected(friend: FriendItem): boolean {
    return this.selectedFriendIds.has(friend.userId);
  }

  isFriendSelectionDisabled(friend: FriendItem): boolean {
    return !this.isFriendSelected(friend) && this.selectedFriendIds.size >= this.maxFriendsPerShare;
  }

  shareCollections(): void {
    const userId = Number(this.cookieService.getCookie('userId'));
    if (!userId || !this.collectionIds.length || !this.selectedFriendIds.size) return;

    this.sharing = true;
    this.shareCollectionService.shareCollections(userId, {
      collectionIds: this.collectionIds,
      friendUserIds: [...this.selectedFriendIds].slice(0, this.maxFriendsPerShare),
    }).subscribe({
      next: (response: ShareCollectionsResponse) => {
        this.sharing = false;
        this.showShareResult(response);
        this.shareCompleted.emit(this.collectionIds);
        this.close();
      },
      error: (error) => {
        this.sharing = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Could not share collections',
          detail: error?.error?.message || 'Please try again.',
          life: 4000,
        });
      },
    });
  }

  private loadFriends(): void {
    const userId = Number(this.cookieService.getCookie('userId'));
    if (!userId) return;

    this.friendsLoading = true;
    this.friendConnectionService.getAllFriends(userId).subscribe({
      next: (friends) => {
        this.friends = friends;
        this.friendsLoading = false;
      },
      error: () => {
        this.friends = [];
        this.friendsLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Friends unavailable', detail: 'Unable to load your friends right now.', life: 3000 });
      },
    });
  }

  private showShareResult(response: ShareCollectionsResponse): void {
    const data = response.data;
    const skipped = data?.skippedOrPartialRecipients ?? [];
    if (skipped.length || data?.totalSharesCreated > 0) {
      this.messageService.add({
        severity: skipped.length ? 'warn' : 'success',
        summary: data.totalSharesCreated <= 0 ? 'No collections are shared' : (skipped.length ? 'Shared with some friends' : 'Collections shared'),
        detail: skipped.length
          ? `${data.totalSharesCreated} shares created. Unable to share with: ${skipped.join(', ')}, Please try again later.`
          : `${data?.totalSharesCreated ?? 0} collection shares created.`,
        life: 5000,
      });
    }

    const alreadyShared = data?.alreadySharedMessages ?? [];
    if (alreadyShared.length) {
      this.messageService.add({ severity: 'info', summary: 'Already shared', detail: alreadyShared.join('\n'), life: 4000 });
    }
  }
}
