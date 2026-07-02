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

  collectionService = inject(CollectionsService);
  authService = inject(AuthService);
  categoryService = inject(CategoryService);

  collections: CollectionDto[] = [];
  originalCollections: CollectionDto[] = [];
  loading = signal(true);
  categoriesLoader = signal(false);
  currentPage = 1;

  // Stores favorite IDs locally because the backend has no favorite API yet.
  favoriteIds = new Set<number>();

  selectedFilters: CollectionFilters = {
    category: null,
    progress: null,
    privacy: null,
  };

  categories = [
    { label: 'All', value: null },
  ];

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
    { label: 'Public', value: 'Public' },
    { label: 'Private', value: 'Private' },
    { label: 'Friend', value: 'Friend' },
  ];
  selectedCategoryLabel: string | null = null;

  ngOnInit(): void {
    this.loadFavorites();
    if (this.authService.isAuthenticated()) {
      this.getUserBasedCollections();
    }
    this.loadCategories();
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
          this.categories = [...this.categories, ...categoriesData];
          this.categoriesLoader.set(false);
        },
        error: (err) => {
          console.error(err);
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
        this.collections = [];
        this.originalCollections = [];
        this.loading.set(false);
      },
    });
  }

  // Updates one filter and requests the matching collection list.
  applyFilter(type: keyof CollectionFilters, value: string | null): void {
    if (this.selectedFilters[type] === value) return;

    this.selectedFilters = { ...this.selectedFilters, [type]: value };
    this.applyLocalFiltersFallback();
  }

  // Clears every filter and reloads the complete user list.
  resetFilters(): void {
    this.selectedFilters = { category: null, progress: null, privacy: null };
    // If the original collection list is already loaded, we can restore it directly or we call User-based-Collections-Api to get the latest collection list and then restore it.
    if(this.originalCollections.length > 0) {
      this.collections = this.originalCollections;
    } else {
      this.getUserBasedCollections();
    }
  }

  hasActiveFilters(): boolean {
    return !!(
      this.selectedFilters.category ||
      this.selectedFilters.progress ||
      this.selectedFilters.privacy
    );
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

  // Toggles the ID and persists favorites across browser refreshes.
  toggleFavorite(collection: CollectionDto): void {
    if (collection.collectionId == null) return;

    const nextFavorites = new Set(this.favoriteIds);
    if (nextFavorites.has(collection.collectionId)) {
      nextFavorites.delete(collection.collectionId);
    } else {
      nextFavorites.add(collection.collectionId);
    }

    this.favoriteIds = nextFavorites;
    localStorage.setItem(
      this.favoritesStorageKey,
      JSON.stringify([...nextFavorites]),
    );
  }

  // Uses the native share sheet, with clipboard copy as a fallback.
  async shareCollection(collection: CollectionDto): Promise<void> {
    if (collection.collectionId == null) return;

    const url = `${window.location.origin}/collections/${collection.collectionId}`;
    const shareData = {
      title: collection.name,
      text: `View ${collection.name}.`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        console.log('Collection share error = ', error);
      }
    }
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
          (!this.selectedFilters.category ||
            collection.category === this.selectedFilters.category) &&
          (!this.selectedFilters.progress ||
            collection.progress === this.selectedFilters.progress) &&
          (!this.selectedFilters.privacy ||
            collection.privacy === this.selectedFilters.privacy),
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
                collection.privacy === this.selectedFilters.privacy),
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

  // Restores valid numeric favorite IDs from local storage.
  private loadFavorites(): void {
    try {
      const storedIds = JSON.parse(
        localStorage.getItem(this.favoritesStorageKey) ?? '[]',
      );
      this.favoriteIds = new Set(
        Array.isArray(storedIds)
          ? storedIds.filter((id): id is number => Number.isInteger(id))
          : [],
      );
    } catch {
      this.favoriteIds = new Set<number>();
    }
  }
}
