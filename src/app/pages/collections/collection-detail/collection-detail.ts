import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RatingModule } from 'primeng/rating';
import { TagModule } from 'primeng/tag';
import { DeleteCollection } from '../delete-collection/delete-collection';
import { UpdateCollection } from '../update-collection/update-collection';
import { CollectionDto, CollectionsService } from '../../services/collections-service';
import { CookieService } from '../../../interceptors/cookie.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ShareCollectionsDialogComponent } from '../../../components/share-collections-dialog/share-collections-dialog';

@Component({
  selector: 'app-collection-detail',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    ProgressSpinnerModule,
    RatingModule,
    TagModule,
    TitleCasePipe,
    ShareCollectionsDialogComponent,
  ],
  templateUrl: './collection-detail.html',
  styleUrl: './collection-detail.scss',
})
export class CollectionDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly collectionsService = inject(CollectionsService);
  private readonly matDialog = inject(MatDialog);
  private cookieService = inject(CookieService);

  // Signals keep loading, error, and collection states reactive in the template.
  collection = signal<CollectionDto | null>(null);
  loading = signal(true);
  errorMessage = signal('');
  shareDialogVisible = false;
  private objectUrl: string | null = null;
  private collectionId = 0;
  userId = parseInt(this.cookieService.getCookie('userId') || '0', 10);
  private destroyRef = inject(DestroyRef); 

  // Reads and validates the collection ID supplied by the details route.
  ngOnInit(): void {
    // we use route.paramMap.pip() which detects and reruns whenever route-param changes in path(dynamic-routing page)
    // instad of using route.snapshot.paramMap- which only reads/runs once when page loaded
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = Number(params.get('id'));

        if (!Number.isInteger(id) || id <= 0) {
          this.errorMessage.set('This collection link is invalid.');
          this.loading.set(false);
          return;
        }

        this.collectionId = id;
        this.errorMessage.set(''); // clear any previous error when a valid id comes in
        this.loading.set(true);    // reset loading state for the new collection
        this.loadCollection();
      });
  }

  // Releases the temporary image URL when leaving the page.
  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  // Opens the existing update dialog and refreshes details after success.
  updateCollection(): void {
    const collection = this.collection();
    if (!collection) return;

    this.matDialog.open(UpdateCollection, { data: { collection } }).afterClosed().subscribe({
      next: (updated: boolean) => {
        if (updated) this.loadCollection();
      },
      error: (error) => console.log('Update dialog error = ', error),
    });
  }

  // send image url if present or send default img url
  getImageUrl(imageUrl : string | null | undefined){
    if(imageUrl === "" || imageUrl === null || imageUrl === undefined){
      return 'https://placehold.co/900x1200?text=No+Cover';
    } else {
      return imageUrl;
    }
  }

  // Opens the delete confirmation and returns Home after deletion.
  deleteCollection(): void {
    const collection = this.collection();
    if (!collection) return;

    this.matDialog.open(DeleteCollection, { data: { collection } }).afterClosed().subscribe({
      next: (deleted: boolean) => {
        if (deleted) this.router.navigate(['/home']);
      },
      error: (error) => console.log('Delete dialog error = ', error),
    });
  }

  openShareDialog(): void {
    if (this.collection()?.collectionId) this.shareDialogVisible = true;
  }

  collectionIdsForShare(collection: CollectionDto): number[] {
    return collection.collectionId == null ? [] : [collection.collectionId];
  }

  getProgressSeverity(progress: string): 'success' | 'info' | 'warn' | 'contrast' {
    const value = progress.toLowerCase();
    if (value.includes('completed')) return 'success';
    if (value.includes('reading') || value.includes('watching')) return 'info';
    if (value.includes('plan') || value.includes('hold')) return 'warn';
    return 'contrast';
  }

  getPrivacySeverity(privacy: string): 'success' | 'warn' {
    return privacy.toLowerCase() === 'public' ? 'success' : 'warn';
  }

  // Finds the route item in the user's collections, then loads its protected image.
  private loadCollection(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.revokeObjectUrl();

    this.collectionsService.getCollectionById(this.userId, this.collectionId).subscribe({
      next: (collection) => {
        if (!collection) {
          this.errorMessage.set('Collection not found or you do not have access to it.');
          this.loading.set(false);
          return;
        }

        if (!collection.imageUrl) {
          this.collection.set(collection);
          this.loading.set(false);
          return;
        }

        if(collection.imageUrl){
          collection.imageUrl = collection.imageUrl + collection.userId; // append this collection's creator userId to imageUrl
        }

        this.collectionsService.getCollectionImage(collection.imageUrl).subscribe({
          next: (imageBlob) => {
            this.objectUrl = URL.createObjectURL(imageBlob);
            this.collection.set({ ...collection, imageUrl: this.objectUrl });
            this.loading.set(false);
          },
          error: () => {
            this.collection.set(collection);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.errorMessage.set('Unable to load this collection right now.');
        this.loading.set(false);
      },
    });
  }

  // Prevents memory leaks caused by browser-created Blob URLs.
  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}