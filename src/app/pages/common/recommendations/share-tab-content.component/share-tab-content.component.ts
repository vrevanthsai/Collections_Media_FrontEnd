import { Component, OnInit, OnDestroy, Input, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccordionModule } from 'primeng/accordion';
import { AvatarModule } from 'primeng/avatar';
import { ShareCollectionService, SharedCollectionItem, ShareGroup, ShareTabType } from '../../../services/share-collection-service';
import { CommonService } from '../../../services/common-service';
import { CookieService } from '../../../../interceptors/cookie.service';

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

  private recommendationsService = inject(ShareCollectionService);
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
  likedShareIds = signal<Set<number>>(new Set());

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

    this.recommendationsService
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

  isLiked(shareId: number): boolean {
    return this.likedShareIds().has(shareId);
  }

  toggleLike(event: Event, item: SharedCollectionItem): void {
    event.stopPropagation(); // don't let the click bubble up and toggle the accordion panel
    this.likedShareIds.update((set) => {
      const next = new Set(set);
      next.has(item.shareId) ? next.delete(item.shareId) : next.add(item.shareId);
      return next;
    });
    // TODO: call your like/unlike API here once it exists, e.g.
    // this.recommendationsService.toggleLike(this.currentUserId, item.shareId).subscribe();
  }

  onWatch(event: Event, item: SharedCollectionItem): void {
    event.stopPropagation();
    this.router.navigate(['/collections', item.collectionId]); // todo- add /action api logic
  }

  goToCollection(item: SharedCollectionItem): void {
    this.router.navigate(['/collections', item.collectionId]);
  }

  ngOnDestroy(): void {
    this.imageCache.forEach((url) => URL.revokeObjectURL(url));
    this.imageCache.clear();
  }
}