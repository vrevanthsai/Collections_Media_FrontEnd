import { Component, inject, signal, DestroyRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../pages/auth/services/auth';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { CookieService } from '../../../interceptors/cookie.service';
import { ProfileService } from '../../../pages/common/profile/services/profile.service';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { InputText } from 'primeng/inputtext';
import {
  CommonService,
  SearchResultItem,
} from '../../../pages/services/common-service';
import { of, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  tap,
  catchError,
} from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CollectionsService } from '../../../pages/services/collections-service';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    CommonModule,
    RouterLinkActive,
    FormsModule,
    AvatarModule,
    OverlayBadgeModule,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private cookieService = inject(CookieService);
  // signal var user for knowing User state
  isLoggedIn = signal<boolean>(false);
  // get user info from cookie which is stored after user logged-In(or login-service-method)
  private userDetails = JSON.parse(
    this.cookieService.getCookie('userDetails') || '{}',
  );
  name = signal<string | null>(this.userDetails.name || null);
  unreadCount = signal(3); // wire this up to your notifications service
  avatarUrl = signal<string | undefined>(undefined);
  allowImageLoad = true; // flag to control image loading
  userId = parseInt(this.cookieService.getCookie('userId') || '0', 10);

  // Search vars
  searchTerm = '';
  searchResults = signal<SearchResultItem[]>([]);
  showResultsPanel = signal(false);
  isSearching = signal(false);
  mobileSearchOpen = signal(false);

  private searchInput$ = new Subject<string>();
  private imageCache = new Map<string, string>();
  private readonly placeholder = 'https://placehold.co/900x1200?text=No+Cover';
  private destroyRef = inject(DestroyRef);

  //  DI to use authService in a component file and Router DI for navigation
  constructor(
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService,
    private profileService: ProfileService,
    private commonService: CommonService,
    private collectionsService: CollectionsService,
  ) {
    this.searchInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((term) => {
          // fewer than 3 characters -> close panel, don't call the API at all
          if (term.trim().length < 3) {
            this.searchResults.set([]);
            this.showResultsPanel.set(false);
            this.isSearching.set(false);
          }
        }),
        filter((term) => term.trim().length >= 3),
        tap(() => this.isSearching.set(true)),
        switchMap((term) =>
          this.commonService
            .searchUserOrCollection(this.userId, term.trim())
            .pipe(catchError(() => of([] as SearchResultItem[]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.isSearching.set(false);
        this.handleSearchResults(results); // cap at 5 rows
        this.showResultsPanel.set(true);
      });
  }

  private handleSearchResults(results: SearchResultItem[]): void {
    const capped = results.slice(0, 5);
    this.searchResults.set(
      capped.map((r) => ({ ...r, resolvedImageUrl: this.placeholder })),
    );
    console.log('results ', results);
    capped.forEach((item) => this.resolveItemImage(item));
  }

  private resolveItemImage(item: SearchResultItem): void {
    if (item.type !== 'user') {
      if (!item.thumbnailUrl) return;

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
          error: (err) => {
            console.log('Error while fetching search item image: ', err);
          },
        });
    } else {
      this.loadOtherUserAvatarImage(item.thumbnailUrl, this.userId, item.id);
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
    this.searchResults.update((items) =>
      items.map((i) => (i.id === id ? { ...i, resolvedImageUrl: url } : i)),
    );
  }

  // ==== ADD THIS — Angular calls it automatically when the component is destroyed ====
  ngOnDestroy(): void {
    this.imageCache.forEach((url) => URL.revokeObjectURL(url));
    this.imageCache.clear();
  }

  // This block runs at first-before all other lines in this component and only runs once when page loads
  ngOnInit(): void {
    this.isLoggedIn = this.authService.getLoggedIn();
    this.name = this.authService.getName();

    // Receive updated user details from ProfileService and update the user signal
    // and it will only trigger when the user details are updated in the ProfileInfoComponent
    this.profileService.sharedData$.subscribe((updatedUser) => {
      if (updatedUser) {
        this.name.set(updatedUser.name || null);
      }
    });

    // Receive updated avatar URL if exists from ProfileService and update the user signal and only called when Usser updates his profile
    this.profileService.sharedAvatarBlobData$.subscribe(
      (avatarBlob: Blob | undefined) => {
        if (avatarBlob) {
          const reader = new FileReader();
          reader.onload = () => {
            this.resizeImage(avatarBlob, 256).then((resizedDataUrl) => {
              this.avatarUrl.set(resizedDataUrl);
            });
          };
          reader.readAsDataURL(avatarBlob);

          this.allowImageLoad = false; // we already have the updated avatar, so no need to load it again from backend twice
        }
      },
    );

    // Load user avatar image from backend if exists
    // only show/call image after user loggined or his accessToken is refreshed
    if (this.allowImageLoad && (this.isLoggedIn() || this.authService.isAuthenticated())) {
      this.loadUserAvatarImage();
    }
  }

  // Logout feature
  logout() {
    this.authService.logout();
    this.authService.setLoggedIn(false);
    // Show Toast notification for successful registration
    this.messageService.add({
      severity: 'success',
      summary: 'Logout Successful!',
      detail: 'Please come back again!',
      life: 4000, // auto-dismiss after 3s
    });
    this.router.navigate(['']); // when user loggedOUt then direct navigated to '' path- Intro page
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) return;
    this.router.navigate(['/search'], {
      queryParams: { q: this.searchTerm.trim() },
    });
  }

  // Search Feature methods
  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchInput$.next(value);
  }

  onSearchEnter(): void {
    if (this.searchTerm.trim().length > 0) {
      this.goToSearchPage();
    }
  }

  onSearchFocus(): void {
    if (this.searchResults().length > 0) {
      this.showResultsPanel.set(true);
    }
  }

  onSearchBlur(): void {
    // delay so a click on a result/button registers before the panel closes
    setTimeout(() => this.showResultsPanel.set(false), 150);
  }

  goToSearchPage(): void {
    this.showResultsPanel.set(false);
    this.mobileSearchOpen.set(false);
    this.router.navigate(['/search'], {
      queryParams: { q: this.searchTerm.trim() },
    });
  }

  onResultClick(item: SearchResultItem): void {
    this.showResultsPanel.set(false);
    this.mobileSearchOpen.set(false);
    this.searchTerm = '';
    // add router logic to navigate to user-view page if username is there or to single collection page
    this.router.navigate(
      item.type === 'user' ? ['/profile', item.id] : ['/collections', item.id],
    );
    // reset searchResults after navigating to above pages
    this.searchResults.set([]);
  }

  onClearSearch(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.searchTerm = '';
    this.searchResults.set([]);
    this.showResultsPanel.set(false);
    this.isSearching.set(false);
  }

  toggleMobileSearch(): void {
    this.mobileSearchOpen.update((v) => !v);
  }

  // Load User Avatar
  loadUserAvatarImage(): void {
    this.userDetails = JSON.parse(
      this.cookieService.getCookie('userDetails') || '{}',
    );
    if (
      this.userDetails?.avatarName !== '' &&
      this.userDetails?.avatarName !== undefined &&
      this.userDetails?.avatarName !== null
    ) {
      this.profileService.getUserAvatarImage(this.userId).subscribe({
        next: (imageBlob: Blob) => {
          this.resizeImage(imageBlob, 256).then((resizedDataUrl) => {
            this.avatarUrl.set(resizedDataUrl);
          });
          this.profileService.updateAvatarBlobData(imageBlob);
        },
        error: (err: any) => {
          console.log('Error while fetching User Avatar Image: ', err);
          this.messageService.add({
            severity: 'error',
            summary:
              err?.error?.message || 'Error while fetching User Avatar Image',
            detail: 'Try again!',
            life: 3000, // auto-dismiss after 3s
          });
        },
      });
    } else {
      // If no avatar image is uploaded, use a default avatar image
      this.avatarUrl.set(
        'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112',
      );
    }
  }

  // Method used for resizing avatar/image to fit small sized icon
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
}
