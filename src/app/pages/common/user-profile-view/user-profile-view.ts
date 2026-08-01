import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { AvatarModule } from 'primeng/avatar';
import { CommonService, UserProfileCollection, UserProfileUser } from '../../services/common-service';
import { CookieService } from '../../../interceptors/cookie.service';


@Component({
  selector: 'app-user-profile-view',
  imports: [CommonModule, RouterModule, PaginatorModule, AvatarModule],
  templateUrl: './user-profile-view.html',
  styleUrl: './user-profile-view.scss',
})
export class UserProfileView implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private commonService = inject(CommonService);
  private destroyRef = inject(DestroyRef);
  private cookieService = inject(CookieService);

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
  }
}
