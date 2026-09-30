import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { CommunityCollection, CommunityService, DefaultCategoryOption } from '../../services/community.service';
import { FormsModule } from '@angular/forms';

type FilterValue<T> = T | 'ALL';

interface SelectOption<T> {
  label: string;
  value: FilterValue<T>;
}

@Component({
  selector: 'app-community-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginatorModule, SelectModule, FormsModule],
  templateUrl: './community-page.component.html',
  styleUrls: ['./community-page.component.scss']
})
export class CommunityPageComponent implements OnInit {
  private communityService = inject(CommunityService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private currentUserId = 7; // TODO: pull from AuthService

  loading = signal(false);
  errorMessage = signal('');

  allCollections = signal<CommunityCollection[]>([]);
  defaultCategories = signal<DefaultCategoryOption[]>([]);

  searchTerm = signal('');
  selectedCategoryId = signal<FilterValue<number>>('ALL');
  selectedRating = signal<FilterValue<number>>('ALL');
  selectedProgress = signal<FilterValue<string>>('ALL');

  rows = 10;
  first = 0;

  ratingOptions: SelectOption<number>[] = [
    { label: 'All Ratings', value: 'ALL' },
    { label: '5 Stars', value: 5 },
    { label: '4 Stars', value: 4 },
    { label: '3 Stars', value: 3 },
    { label: '2 Stars', value: 2 },
    { label: '1 Star', value: 1 }
  ];

  categoryOptions = computed<SelectOption<number>[]>(() => [
    { label: 'All Categories', value: 'ALL' },
    ...this.defaultCategories().map((c) => ({ label: c.categoryName, value: c.categoryId }))
  ]);

  progressOptions = computed<SelectOption<string>[]>(() => {
    const unique = Array.from(new Set(this.allCollections().map((c) => c.progress))).sort();
    return [{ label: 'All Progress', value: 'ALL' }, ...unique.map((p) => ({ label: p, value: p }))];
  });

  filteredCollections = computed(() => {
    let list = this.allCollections();

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      list = list.filter((c) => c.name.toLowerCase().includes(term));
    }

    const categoryId = this.selectedCategoryId();
    if (categoryId !== 'ALL') {
      list = list.filter((c) => c.defaultCategoryId === categoryId);
    }

    const rating = this.selectedRating();
    if (rating !== 'ALL') {
      list = list.filter((c) => c.rating === rating);
    }

    const progress = this.selectedProgress();
    if (progress !== 'ALL') {
      list = list.filter((c) => c.progress === progress);
    }

    return list;
  });

  totalRecords = computed(() => this.filteredCollections().length);
  pagedCollections = computed(() => this.filteredCollections().slice(this.first, this.first + this.rows));

  hasActiveFilters = computed(
    () =>
      this.searchTerm().trim().length > 0 ||
      this.selectedCategoryId() !== 'ALL' ||
      this.selectedRating() !== 'ALL' ||
      this.selectedProgress() !== 'ALL'
  );

  ngOnInit(): void {
    this.loading.set(true);

    forkJoin({
      collections: this.communityService.getPublicCollections(this.currentUserId),
      categories: this.communityService.getDefaultCategories()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ collections, categories }) => {
          this.loading.set(false);
          this.allCollections.set(collections);
          this.defaultCategories.set(categories);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Unable to load community collections right now.');
        }
      });
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.first = 0;
  }

  onCategoryChange(value: FilterValue<number>): void {
    this.selectedCategoryId.set(value);
    this.first = 0;
  }

  onRatingChange(value: FilterValue<number>): void {
    this.selectedRating.set(value);
    this.first = 0;
  }

  onProgressChange(value: FilterValue<string>): void {
    this.selectedProgress.set(value);
    this.first = 0;
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategoryId.set('ALL');
    this.selectedRating.set('ALL');
    this.selectedProgress.set('ALL');
    this.first = 0;
  }

  onPageChange(event: PaginatorState): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  starArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }

  statusClass(progress: string): string {
    const key = (progress || '').toLowerCase();
    if (key === 'completed') return 'status-pill--completed';
    if (['watching', 'reading', 'playing', 'in progress'].includes(key)) return 'status-pill--progress';
    if (key === 'dropped') return 'status-pill--dropped';
    if (key === 'onhold') return 'status-pill--onhold';
    return 'status-pill--planned';
  }

  goToCollection(c: CommunityCollection): void {
    this.router.navigate(['/collections', c.collectionId]);
  }

  goToUser(event: Event, c: CommunityCollection): void {
    event.stopPropagation();
    this.router.navigate(['/users-profile/', c.userId]);
  }
}