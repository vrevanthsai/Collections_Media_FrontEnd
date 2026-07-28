import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { CommonService, SearchResultItem } from '../../services/common-service';
import { CollectionsService } from '../../services/collections-service';
import { CookieService } from '../../../interceptors/cookie.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PaginatorModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private commonService = inject(CommonService);
  private collectionsService = inject(CollectionsService);
  private destroyRef = inject(DestroyRef);
  private cookieService = inject(CookieService);

  private currentUserId = parseInt(this.cookieService.getCookie('userId') || '0', 10);

  searchTerm = '';
  loading = signal(false);
  errorMessage = signal('');
  allResults = signal<SearchResultItem[]>([]);
  showSearchResult : boolean = false;

  rows = 6;
  first = 0;
  rowsPerPageOptions = [6, 12, 24];

  private imageCache = new Map<string, string>();
  private readonly placeholder = 'https://placehold.co/900x1200?text=No+Cover';

  pagedResults = computed(() =>
    this.allResults().slice(this.first, this.first + this.rows),
  );
  totalRecords = computed(() => this.allResults().length);

  ngOnInit(): void {
    // reacts to /search?q=... whenever the query param changes, including
    // navigating here again from the navbar with a different term
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const q = params.get('q') ?? '';
        this.searchTerm = q;
        this.first = 0;

        if (q.trim().length >= 3) {
          this.performSearch(q.trim());
        } else {
          this.allResults.set([]);
        }
      });
  }

  onSearchSubmit(): void {
    const q = this.searchTerm.trim();
    if (q.length < 3) {
      this.errorMessage.set('Type at least 3 characters to search.');
      return;
    }
    // keeps the URL in sync so this page stays bookmarkable/shareable
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q },
      queryParamsHandling: 'merge',
    });
  }

  onClearSearch() : void {
    this.searchTerm = '';
    this.allResults.set([]);
    this.errorMessage.set('');
    this.showSearchResult = false;
  }

  private performSearch(query: string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.showSearchResult = true;

    this.commonService
      .searchUserOrCollection(this.currentUserId, query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          this.loading.set(false);
          const withPlaceholders = results.map((r) => ({
            ...r,
            resolvedImageUrl: this.placeholder,
          }));
          this.allResults.set(withPlaceholders);
          withPlaceholders.forEach((item) => this.resolveItemImage(item));
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(
            'Something went wrong while searching. Please try again.',
          );
          this.allResults.set([]);
        },
      });
  }

  private resolveItemImage(item: SearchResultItem): void {
    if (item.type !== 'user') {
      if (!item.thumbnailUrl) return;
    if (!item.thumbnailUrl) return;

    // local/ts Cache logic to store image-Blob data of each image in searchResult and reuse it
    // instead of calling api for every page switching in pagination of search page
    const cached = this.imageCache.get(item.thumbnailUrl);
    if (cached) {
      this.patchResolvedUrl(item.id, cached);
      return;
    }

    this.collectionsService
      .getCollectionImage(item.thumbnailUrl)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.imageCache.set(item.thumbnailUrl, url);
          this.patchResolvedUrl(item.id, url);
        },
        error: (err) =>
          console.log('Error fetching image for search result:', err),
      });
    } else {
      this.loadOtherUserAvatarImage(item.thumbnailUrl, this.currentUserId, item.id);
    }
  }

  // Load Other User Avatar
  loadOtherUserAvatarImage(
    imageName: string | undefined,
    userId: number,
    otherUserId: number,
  ): void {
    if (
      userId !== null &&
      imageName !== '' &&
      imageName !== undefined &&
      imageName !== null
    ) {
      this.commonService
        .getOtherUserAvatarImage(userId, otherUserId)
        .subscribe({
          next: (imageBlob: Blob) => {
            const reader = new FileReader();
            let avatarUrl = '';
            reader.onload = () => {
              avatarUrl = reader.result as string;
              this.patchResolvedUrl(otherUserId, avatarUrl);
            };
            reader.readAsDataURL(imageBlob);
          },
          error: (err: any) => {
            console.log(
              'Error while fetching User Avatar Image in Search results: ',
              err,
            );
          },
        });
    } else {
      // If no avatar image is uploaded, use a default avatar image
      let avatarUrl =
        'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112';
      this.patchResolvedUrl(otherUserId, avatarUrl);
    }
  }

  private patchResolvedUrl(id: number, url: string): void {
    this.allResults.update((items) =>
      items.map((i) => (i.id === id ? { ...i, resolvedImageUrl: url } : i)),
    );
  }

  onPageChange(event: PaginatorState): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows; // fall back to current rows if undefined
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onCardClick(item: SearchResultItem): void {
    this.router.navigate(
      item.type === 'user' ? ['/profile', item.id] : ['/collections', item.id],
    );
  }

  ngOnDestroy(): void {
    this.imageCache.forEach((url) => URL.revokeObjectURL(url));
    this.imageCache.clear();
  }
}
