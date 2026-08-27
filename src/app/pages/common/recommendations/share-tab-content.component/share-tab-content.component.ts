import { Component, OnInit, OnDestroy, Input, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccordionModule } from 'primeng/accordion';
import { AvatarModule } from 'primeng/avatar';
import { ShareActionStatus, ShareCollectionService, SharedCollectionItem, ShareGroup, ShareTabType } from '../../../services/share-collection-service';
import { CommonService } from '../../../services/common-service';
import { CookieService } from '../../../../interceptors/cookie.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-share-tab-content',
  standalone: true,
  imports: [CommonModule, RouterModule, AccordionModule, AvatarModule],
  templateUrl: './share-tab-content.component.html',
  styleUrls: ['./share-tab-content.component.scss']
})
export class ShareTabContentComponent implements OnInit, OnDestroy {
  @Input({ required: true }) tabType!: ShareTabType;
  @Input() introText = '';
  @Input() emptyText = 'Nothing here yet.';

  private sharedCollectionService = inject(ShareCollectionService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private commonService = inject(CommonService);

  private cookieService = inject(CookieService);
  currentUserId = parseInt(this.cookieService.getCookie('userId') || '0', 10);

  loading = signal(false);
  errorMessage = signal('');
  groups = signal<ShareGroup[]>([]);
  sortOrder = signal<'latest' | 'oldest'>('latest');
  avatarCache = signal<Record<number, string>>({});
  // Holds optimistic action-status changes, while the item retains the status from the last load.
  actionLikedStatusOverrides = signal<Record<number, ShareActionStatus>>({});
  actionWatchStatusOverrides = signal<Record<number, boolean>>({});
  private messageService = inject(MessageService);

  private imageCache = new Map<string, string>();
  private readonly placeholder = 'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112'; // default avatar img

  sortedGroups = computed(() => {
    const list = [...this.groups()];
    const dir = this.sortOrder() === 'latest' ? -1 : 1;
    return list.sort(
      (a, b) => dir * (new Date(a.latestSharedAt).getTime() - new Date(b.latestSharedAt).getTime())
    );
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.sharedCollectionService
      .getRecommendations(this.currentUserId, this.tabType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          this.loading.set(false);
          this.groups.set(groups);
          groups.forEach((g) => this.resolveAvatar(g));
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Unable to load shared collections right now.');
        }
      });
  }

  private resolveAvatar(n: ShareGroup): void {
    if (!n.sharedByImageName) return;

    const cached = this.imageCache.get(n.sharedByImageName);
    if (cached) {
      this.setAvatar(n.sharedByUserId, cached);
      return;
    }

    if (this.currentUserId !== null &&
      n.sharedByImageName !== '' &&
      n.sharedByImageName !== undefined &&
      n.sharedByImageName !== null
    ) {
      this.commonService
        .getOtherUserAvatarImage(this.currentUserId, n.sharedByUserId) // sharedByUserId = otherUserId
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob) => {
            this.resizeImage(blob, 256).then((resizedDataUrl) => {
              const url = resizedDataUrl;
              this.imageCache.set(n.sharedByImageName, url);
              this.setAvatar(n.sharedByUserId, url);
            });
          },
          error: () => { } // keep placeholder
        });
    } else {
      // do nothing- default image is auto assigned initially ro varx
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

  private setAvatar(userId: number, url: string): void {
    this.avatarCache.update((map) => ({ ...map, [userId]: url }));
  }

  avatarFor(g: ShareGroup): string {
    return this.avatarCache()[g.sharedByUserId] ?? this.placeholder;
  }

  setSort(order: 'latest' | 'oldest'): void {
    this.sortOrder.set(order);
  }

  isLiked(item: SharedCollectionItem): boolean {
    // Check if there's an override for this item's shareId; if not, use the item's current actionStatus
    return (this.actionLikedStatusOverrides()[item.shareId] ?? item.actionStatus) === 'LIKED';
  }

  toggleLike(event: Event, item: SharedCollectionItem): void {
    event.stopPropagation(); // don't let the click bubble up and toggle the accordion panel
    const nextStatus: ShareActionStatus = this.isLiked(item) ? 'PENDING' : 'LIKED';
    // Optimistically update the UI to reflect the new status
    this.actionLikedStatusOverrides.update((statuses) => ({ ...statuses, [item.shareId]: nextStatus }));

    this.sharedCollectionService.updateShareActionStatus(item.shareId, nextStatus, this.currentUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Optionally show a success message or update UI
          if (nextStatus === 'LIKED') {
            this.messageService.add({ severity: 'success', summary: 'Liked', detail: 'Collection liked successfully.' });
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error occurred while trying to like the collection.' });
          this.actionLikedStatusOverrides.update((statuses) => {
            const next = { ...statuses };
            delete next[item.shareId];
            return next;
          });
        }
      });

  }

  isWatched(item: SharedCollectionItem): boolean {
    // Check if there's an override for this item's shareId; if not, use the item's current actionStatus
    return (this.actionWatchStatusOverrides()[item.shareId] ?? item.addedToWatchlist) === true;
  }

  onWatch(event: Event, item: SharedCollectionItem): void {
    event.stopPropagation();
    //  here also same like Like status flow, toggling is done for Watch status and backend is updated but no notification is sent/created to sharedByUser(friend) account
    const nextStatus: boolean = this.isWatched(item) ? false : true;
    // Optimistically update the UI to reflect the new status
    this.actionWatchStatusOverrides.update((statuses) => ({ ...statuses, [item.shareId]: nextStatus }));

    this.sharedCollectionService.updateWatchListStatus(item.shareId, nextStatus, this.currentUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Optionally show a success message or update UI
          if (nextStatus === true) {
            this.messageService.add({ severity: 'success', summary: 'Watched', detail: 'Recommended Collection added to your Watch List successfully.' });
          } else {
            this.messageService.add({ severity: 'warning', summary: 'Unwatched', detail: 'Recommended Collection removed from your Watch List successfully.' });
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error occurred while trying to add to watch list.' });
          this.actionWatchStatusOverrides.update((statuses) => {
            const next = { ...statuses };
            delete next[item.shareId];
            return next;
          });
        }
      });
  }

  goToCollection(item: SharedCollectionItem): void {
    if (this.tabType === 'SHARE_WITH_ME' && !item.viewed) {
      // we need to mark as viewed for SHARE_WITH_ME tab, before navigating to collection and dont call this api if already viewed, to avoid unnecessary api call
      this.sharedCollectionService.markViewed(this.currentUserId, item.shareId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            console.log('Successfully marked shared/recommended collection as viewed:', res);
            // Optionally show a success message or update UI
            // this.messageService.add({ severity: 'info', summary: 'Viewed', detail: 'Recommended Collection marked as viewed.' });
            this.router.navigate(['/collections', item.collectionId]);
          },
          error: (err) => {
            console.error('Error while marking shared/recommended collection as viewed:', err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error occurred while marking as viewed.' });
          }
        });
    } else {
      // we dont need to mark as viewed for SHARE_BY_ME tab, just navigate to collection
      this.router.navigate(['/collections', item.collectionId]);
    }
  }

  ngOnDestroy(): void {
    this.imageCache.forEach((url) => URL.revokeObjectURL(url));
    this.imageCache.clear();
  }
}
