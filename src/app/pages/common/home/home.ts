import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RatingModule } from 'primeng/rating';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../auth/services/auth';
import {
  CollectionDto,
  CollectionFilters,
  CollectionsService,
} from '../../services/collections-service';
import { CategoryService } from '../../services/category-service';
import { CookieService } from '../../../interceptors/cookie.service';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ShareCollectionsDialogComponent } from '../../../components/share-collections-dialog/share-collections-dialog';

type UserFavorites = {
  userID: number;
  favoriteCollectionIds: number[];
};

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    RatingModule,
    FormsModule,
    ProgressSpinnerModule,
    TitleCasePipe,
    CommonModule,
    InputTextModule,
    CheckboxModule,
    ShareCollectionsDialogComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  // Limits each Home page to six collection cards.
  private readonly pageSize = 3;
  private readonly favoritesStorageKey = 'favoriteCollectionIds';
  private readonly router = inject(Router);
  private cookieService = inject(CookieService);
  messageService = inject(MessageService);

  collectionService = inject(CollectionsService);
  authService = inject(AuthService);
  categoryService = inject(CategoryService);

  collections: CollectionDto[] = [];
  originalCollections: CollectionDto[] = [];
  loading = signal(true);
  categoriesLoader = signal(false);
  currentPage = 1;

  // Stores the current user's favorite IDs locally because the backend has no favorite API yet.
  favoriteIds = new Set<number>();
  selectedCollectionIds = new Set<number>();
  shareDialogVisible = false;

  selectedFilters: CollectionFilters = {
    category: null,
    progress: null,
    privacy: null,
    favorite: false,
  };

  categories = [{ label: 'All', value: null }];

  // get user info from cookie which is stored after user logged-In
  userId = signal<string | null>(this.cookieService.getCookie('userId'));

  progressOptions = [
    { label: 'All', value: null },
    { label: 'Started', value: 'Started' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Watching', value: 'Watching' },
    { label: 'OnHold', value: 'OnHold' },
  ];

  privacyOptions = [
    { label: 'All', value: null },
    { label: 'Public', value: 'PUBLIC' },
    { label: 'Private', value: 'PRIVATE' },
    { label: 'Friends', value: 'FRIENDS' },
  ];
  selectedCategoryLabel: string | null = null;
  suspendedUserStatus: boolean = false;
  suspendUserConfirmation: string = "";
  suspendLoading: boolean = false;
  suspendErrorMessage: string = '';

  ngOnInit(): void {
    this.loadFavorites();
    if (this.authService.isAuthenticated()) {
      this.getUserBasedCollections();
    }
    this.checkCategories();
  }

  // checks if categories list data is there or not in localStorage
  checkCategories(): void {
    // Load categories data from localStorage- if exists or recall categories api
    const localStorageCategories: any[] = JSON.parse(
      localStorage.getItem('categories') || '[]',
    );
    if (localStorageCategories.length > 0) {
      let categoriesData = localStorageCategories.map((category) => ({
        label: category.categoryName,
        value: category.categoryId,
      }));
      this.categories = [...this.categories, ...categoriesData];
    } else {
      this.loadCategories();
    }
  }

  loadCategories(): void {
    this.categoriesLoader.set(true);
    let userId = parseInt(this.userId() || ''); // Convert to number, default to 0 if null

    if (!isNaN(userId)) {
      this.categoryService.getUserCategories(userId).subscribe({
        next: (data) => {
          let categoriesData = data.map((category) => ({
            label: category.categoryName,
            value: category.categoryId,
          }));
          localStorage.setItem('categories', JSON.stringify(data));
          this.categories = [...this.categories, ...categoriesData];
          this.categoriesLoader.set(false);
        },
        error: (err) => {
          console.error('Error loading categories data:', err);
          this.messageService.add({
            severity: 'error',
            summary:
              err?.error?.message || 'Error while fetching categories data',
            detail: 'Try again!',
            life: 3000, // auto-dismiss after 3s
          });
          this.categoriesLoader.set(false);
        },
      });
    } else {
      console.error('Invalid userId: ', userId);
      this.categoriesLoader.set(false);
    }
  }

  // Calculates pagination from the latest collection array.
  totalPages(): number {
    return Math.max(1, Math.ceil(this.collections.length / this.pageSize));
  }

  // Returns only the cards belonging to the active page.
  paginatedCollections(): CollectionDto[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.collections.slice(startIndex, startIndex + this.pageSize);
  }

  collectionDisplayIndex(indexOnPage: number): number {
    return (this.currentPage - 1) * this.pageSize + indexOnPage + 1;
  }

  // Loads the signed-in user's collections for the Home page.
  getUserBasedCollections(): void {
    this.loading.set(true);
    this.currentPage = 1;
    const userId = parseInt(this.userId() || '0', 10);

    this.collectionService.getUserBasedCollections(userId).subscribe({
      next: (response) => {
        this.collections = response;
        this.originalCollections = response;
        this.loading.set(false);
      },
      error: (error) => {
        console.log('Collection load error = ', error);
        this.messageService.add({
          severity: 'error',
          summary:
            error?.error?.message || 'Error while fetching collections data',
          detail: 'Try again!',
          life: 3000, // auto-dismiss after 3s
        });
        this.collections = [];
        this.originalCollections = [];
        this.loading.set(false);
        // adding logic for Suspended User- to request Access/Activate his account to Admin
        if (error?.error?.success === false && error?.error?.message === "Your account has been suspended. Please contact support.") {
          this.suspendedUserStatus = true;
        }
      },
    });
  }

  // Updates one filter and requests the matching collection list.
  applyFilter(type: keyof CollectionFilters, value: string | null): void {
    // page is reset to 1 when a filter is applied, so that the user sees the first page of results.
    this.currentPage = 1;
    if (this.selectedFilters[type] === value) return;

    this.selectedFilters = { ...this.selectedFilters, [type]: value };
    this.applyLocalFiltersFallback();
  }

  // Clears every filter and reloads the complete user list.
  resetFilters(): void {
    this.selectedFilters = { category: null, progress: null, privacy: null, favorite: false };
    // If the original collection list is already loaded, we can restore it directly or we call User-based-Collections-Api to get the latest collection list and then restore it.
    if (this.originalCollections.length > 0) {
      this.collections = this.originalCollections;
      this.currentPage = 1;
    } else {
      this.getUserBasedCollections();
    }
  }

  hasActiveFilters(): boolean {
    return !!(
      this.selectedFilters.category ||
      this.selectedFilters.progress ||
      this.selectedFilters.privacy ||
      this.selectedFilters.favorite
    );
  }

  // Shows only locally stored favorites; clicking again restores the other filters' results.
  toggleFavoriteFilter(): void {
    this.currentPage = 1;
    this.selectedFilters = {
      ...this.selectedFilters,
      favorite: !this.selectedFilters.favorite,
    };
    this.applyLocalFiltersFallback();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage = page;
  }

  // Opens the details route when the user selects a collection card.
  openCollection(collection: CollectionDto): void {
    if (collection.collectionId == null) return;
    this.router.navigate(['/collections', collection.collectionId]);
  }

  // Lets the template render the correct heart state for each card.
  isFavorite(collection: CollectionDto): boolean {
    return (
      collection.collectionId != null &&
      this.favoriteIds.has(collection.collectionId)
    );
  }

  // Toggles the ID and persists favorites across browser refreshes for this user only.
  toggleFavorite(collection: CollectionDto): void {
    if (collection.collectionId == null) return;

    const nextFavorites = new Set(this.favoriteIds);
    if (nextFavorites.has(collection.collectionId)) {
      nextFavorites.delete(collection.collectionId);
    } else {
      nextFavorites.add(collection.collectionId);
    }

    this.favoriteIds = nextFavorites;
    this.saveFavorites(nextFavorites);

    // Keep the visible result set accurate when Favorites only is active.
    if (this.selectedFilters.favorite) this.applyLocalFiltersFallback();
  }

  isCollectionSelected(collection: CollectionDto): boolean {
    return collection.collectionId != null && this.selectedCollectionIds.has(collection.collectionId);
  }

  toggleCollectionSelection(collection: CollectionDto): void {
    if (collection.collectionId == null) return;
    const next = new Set(this.selectedCollectionIds);
    next.has(collection.collectionId) ? next.delete(collection.collectionId) : next.add(collection.collectionId);
    this.selectedCollectionIds = next;
  }

  openShareDialog(): void {
    if (!this.selectedCollectionIds.size) return;
    this.shareDialogVisible = true;
  }

  onCollectionsShared(): void {
    this.selectedCollectionIds = new Set<number>();
  }

  selectedCollectionIdList(): number[] {
    return Array.from(this.selectedCollectionIds);
  }

  // Maps progress values to PrimeNG tag colors.
  getProgressSeverity(
    progress: string,
  ): 'success' | 'info' | 'warn' | 'contrast' {
    const value = progress.toLowerCase();
    if (value.includes('completed')) return 'success';
    if (value.includes('reading') || value.includes('watching')) return 'info';
    if (value.includes('plan') || value.includes('hold')) return 'warn';
    return 'contrast';
  }

  // we use Filters locally/ClientSide-Filtering, as backend filter Api/endpoint is unavailable.
  private applyLocalFiltersFallback(): void {
    // If the original collection list is already loaded, we can filter it directly or we call User-based-Collections-Api to get the latest collection list and then filter it locally.
    if (this.originalCollections.length > 0) {
      this.collections = this.originalCollections.filter(
        (collection) =>
          // if condition is true then we include the collection in the filtered list, otherwise we exclude it.
          (!this.selectedFilters.category ||
            collection.category === this.selectedFilters.category) &&
          (!this.selectedFilters.progress ||
            collection.progress === this.selectedFilters.progress) &&
          (!this.selectedFilters.privacy ||
            collection.privacy === this.selectedFilters.privacy) &&
          (!this.selectedFilters.favorite || this.isFavorite(collection)),
      );
    } else {
      const userId = parseInt(this.userId() || '0', 10);
      this.collectionService.getUserBasedCollections(userId).subscribe({
        next: (response) => {
          this.collections = response.filter(
            (collection) =>
              (!this.selectedFilters.category ||
                collection.category === this.selectedFilters.category) &&
              (!this.selectedFilters.progress ||
                collection.progress === this.selectedFilters.progress) &&
              (!this.selectedFilters.privacy ||
                collection.privacy === this.selectedFilters.privacy) &&
              (!this.selectedFilters.favorite || this.isFavorite(collection)),
          );
          this.loading.set(false);
        },
        error: (error) => {
          console.log('Fallback filter error = ', error);
          this.collections = [];
          this.loading.set(false);
        },
      });
    }
  }

  // Restores valid numeric favorite IDs for the signed-in user only.
  private loadFavorites(): void {
    try {
      const storedFavorites: unknown = JSON.parse(
        localStorage.getItem(this.favoritesStorageKey) ?? '[]',
      );
      const currentUserId = this.getCurrentUserId();
      const userFavorites = Array.isArray(storedFavorites)
        ? storedFavorites.find(
          (entry): entry is UserFavorites =>
            this.isUserFavorites(entry) && entry.userID === currentUserId,
        )
        : undefined;

      this.favoriteIds = new Set(userFavorites?.favoriteCollectionIds ?? []);
    } catch {
      this.favoriteIds = new Set<number>();
    }
  }

  private saveFavorites(favoriteIds: Set<number>): void {
    const currentUserId = this.getCurrentUserId();
    if (currentUserId == null) return;

    let storedFavorites: UserFavorites[] = [];
    try {
      const storedValue: unknown = JSON.parse(
        localStorage.getItem(this.favoritesStorageKey) ?? '[]',
      );
      if (Array.isArray(storedValue)) {
        storedFavorites = storedValue.filter((entry): entry is UserFavorites =>
          this.isUserFavorites(entry),
        );
      }
    } catch {
      // Replace malformed storage with the current user's valid entry below.
    }

    const currentUserFavorites: UserFavorites = {
      userID: currentUserId,
      favoriteCollectionIds: [...favoriteIds],
    };
    const userIndex = storedFavorites.findIndex(
      (entry) => entry.userID === currentUserId,
    );

    if (userIndex >= 0) {
      storedFavorites[userIndex] = currentUserFavorites;
    } else {
      storedFavorites.push(currentUserFavorites);
    }

    localStorage.setItem(this.favoritesStorageKey, JSON.stringify(storedFavorites));
  }

  private getCurrentUserId(): number | null {
    const userId = Number(this.cookieService.getCookie('userId'));
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  }

  private isUserFavorites(value: unknown): value is UserFavorites {
    if (!value || typeof value !== 'object') return false;

    const entry = value as UserFavorites;
    return (
      Number.isInteger(entry.userID) &&
      Array.isArray(entry.favoriteCollectionIds) &&
      entry.favoriteCollectionIds.every((id) => Number.isInteger(id))
    );
  }

  // Method for Suspended User's to send activate request to Admin
  activateAccount(): void {
    if (this.suspendUserConfirmation.trim() === "I-am-sorry") {
      if (this.userId !== null) {
        this.suspendLoading = true;
        let userId: number = parseInt(this.userId() || '0', 10);
        this.authService.activateAccountRequest(userId, this.suspendUserConfirmation)
          .subscribe({
            next: (res: string) => {
              this.messageService.add({
                severity: 'success',
                summary: "Request Status",
                detail: res || 'Request sent successfully!',
                life: 3000, // auto-dismiss after 3s
              });
              this.suspendUserConfirmation = ''; // Reset confirmation input
              this.suspendLoading = false; // Reset loading state
              this.suspendErrorMessage = '';
            },
            error: (err) => {
              console.log('Error while sending your request: ', err);
              this.messageService.add({
                severity: 'error',
                summary:
                  err?.error?.message || 'Error while sending your request',
                detail: 'Try again!',
                life: 3000, // auto-dismiss after 3s
              });
              this.suspendUserConfirmation = '';
              this.suspendLoading = false; // Reset loading state
              this.suspendErrorMessage = '';
            }
          })
      }
    } else {
      this.suspendErrorMessage =
        'Please type "I-am-sorry" to confirm.';
    }
  }
}
