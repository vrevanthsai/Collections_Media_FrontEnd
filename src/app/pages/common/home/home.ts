import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { catchError, forkJoin, map, of } from 'rxjs';
import { CollectionDto, CollectionsService } from '../../services/collections-service';
import { RatingModule } from 'primeng/rating';
import { FormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TitleCasePipe, CommonModule } from '@angular/common';
import { AuthService } from '../../auth/services/auth';
import { MatDialog } from "@angular/material/dialog";
import { UpdateCollection } from '../../collections/update-collection/update-collection';

@Component({
  selector: 'app-home',
  // standalone component for new >angV17- when you use a module then import them in their component files instead of app.module.ts
  imports: [RouterLink, CardModule, ButtonModule, TagModule, RatingModule,
    FormsModule, ProgressSpinnerModule, TitleCasePipe, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {

  // Collection Service DI
  collectionService = inject(CollectionsService);
  authService = inject(AuthService);
  // Angular-Material- MatDialog DI - it is used for sending data from one comp to another comp while using dialog Module to displat - 2nd comp which has 1st comp data
  matDialog = inject(MatDialog);

  // var to store GET-All api res
  collections: CollectionDto[] = [];
  private readonly objectUrls: string[] = [];
  loading = signal<boolean>(true);

  // Here we get all collections data when page initially loads once
  ngOnInit(): void {
    this.getAllCollections();
  }

  // this lifecycle hook is used for cleanup of created oject URLs to prevent memory leaks when the component is destroyed or navigated away from.
  // It revokes all objects URLs created for collection images to free up memory resources.
  ngOnDestroy(): void {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }

  getAllCollections() {
    this.loading.set(true);

    this.collectionService.getAllCollections().subscribe({
      next: (response) => {
        // console.log('response = ', response);
        // this.collections = response;
        // we are calling this function because - we need to get images with token access or else images won't load
        this.loadProtectedImages(response);
      },
      error: (err) => {
        console.log('error = ', err);
        this.loading.set(false);
      },
    });
  }

  // This method loads protected(SpringSecurity) images for collections from backend and converts them into displayable URLs 
  // and attaches them to the collection objects so Angular can display them.
  private loadProtectedImages(collections: CollectionDto[]) {
    if (collections.length === 0) {
      this.collections = [];
      this.loading.set(false);
      return;
    }

    // Prepares an array of Observables for fetching images for each collection that has an imageUrl. If a collection doesn't have an imageUrl, it simply returns the collection as is.
    const collectionRequests = collections.map((collection) => {
      if (!collection.imageUrl) {
        return of(collection);
      }

      // Loops through each collection and prepares HTTP requests to fetch images.
      return this.collectionService.getCollectionImage(collection.imageUrl).pipe(
        // map()- An RxJS operator used to transform emitted data.
        map((imageBlob) => {
          // Converts the image Blob → temporary browser URL so it can be displayed in <img>.
          const objectUrl = URL.createObjectURL(imageBlob);
          this.objectUrls.push(objectUrl);

          // Creates a new collection object and replaces imageUrl(from GET-All Api call) with the generated object URL.
          return {
            ...collection,
            imageUrl: objectUrl,
          };
        }),
        // If image loading fails, it logs the error and returns the original collection.
        catchError((error) => {
          console.log('image load error = ', error);
          return of(collection);
        })
      );
    });

    // forkJoin- Combines multiple Observables and waits for all to complete or waits until all image requests finish and once all are done,
    // Then it updates this.collections with collections that now contain displayable image URLs.
    forkJoin(collectionRequests).subscribe((collectionsWithImages) => {
      this.collections = collectionsWithImages;
      this.loading.set(false);
    });
  }

  // This function sets the color(severity) of the progress tag/field based on its value
  getProgressSeverity(progress: string): 'success' | 'info' | 'warn' | 'contrast' {
    const normalizedProgress = progress.toLowerCase();

    if (normalizedProgress.includes('completed')) {
      return 'success';
    }

    if (normalizedProgress.includes('reading') || normalizedProgress.includes('watching')) {
      return 'info';
    }

    if (normalizedProgress.includes('plan')) {
      return 'warn';
    }

    return 'contrast';
  }

  // This function sets the color(severity) of the privacy tag/field based on its value
  getPrivacySeverity(privacy: string): 'success' | 'warn' {
    return privacy.toLowerCase() === 'public' ? 'success' : 'warn';
  }

  isAdmin(): boolean {
    // if stored Role has ADMIN value then returns True or else False(USER)
    return this.authService.hasRole('ADMIN');
  }

  // Update and Delete Buttons Methods - only enabled for Admin-based Roles
  updateCollection(collection: CollectionDto){
    console.log("update collection: ", collection);

    // THis Ref opens DialogModule of Angular-Material when user clicks Update button which contains Update form with shared collection data
    const dialogRef = this.matDialog.open(UpdateCollection, {
      data: { collection: collection } // key/value of data object to be shared
    });

    // When Dialog closes- when user completes his form submission then
    //  we get/pass boolean result which we use for re-calling GET-All api for showing updated Data of that collection in cards
    dialogRef.afterClosed().subscribe({
      next: (res: boolean) => {
        if(res){
          this.getAllCollections(); // re-call get-api or refreshing home comp
        }
      },
      error: (err) => {
        console.log("err from Dialog = ", err);
      }
    })
  }

}
