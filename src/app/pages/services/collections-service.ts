import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// This file handles All Collection APIs handling logic
@Injectable({
  providedIn: 'root',
})
export class CollectionsService {
  // Todo- create and import base URL from .env file
  public readonly BASE_URL = 'http://localhost:8080';

  // new signal based DI instead of constructor injection
  http = inject(HttpClient);

  // Every API function should contain both Request and Reponse Types with respect to Backend logic

  // GET-ALL collections API handler and we get data in the form of CollectionDto array
  getAllCollections(): Observable<CollectionDto[]> {
    return this.http.get<CollectionDto[]>(`${this.BASE_URL}/api/v1/collection/all`);
  }

  // GET-Collection Image API handler which returns the image as a Blob (binary data) and we will convert it to an object URL in the component for display
  // and automatically bearer token is added - so img loads
  getCollectionImage(imageUrl: string): Observable<Blob> {
    // response for image - we get from APi is in the form of BLob- so we specify it
    return this.http.get(imageUrl, { responseType: 'blob' });
  }

  // Post-Api - /add-collection api to save new collection data into DB
  addCollectionService(collectionDto: CollectionDto, file: File): Observable<CollectionDto>{
    // we send both payload and file as seperate args to backend using FormData
    const formData = new FormData();
    // formData- both Keys - naming MUST be SAME as declared in Backend-Api-Method params and same types for Better data mapping
    formData.append("collectionDto", JSON.stringify(collectionDto));
    formData.append("file", file);

    // Call Api
    return this.http.post<CollectionDto>(`${this.BASE_URL}/api/v1/collection/add-collection`, formData); // now formData has both json and image-file
  }
}

// TODO- Create seperate file for managing Types
// Collection Response for all Collection-based APIs
export type CollectionDto = {
  collectionId?: number, // optional field
  name: string,
  category: string,
  userId: string,
  rating: number,
  review: string,
  progress: string,
  privacy: string,
  addedDate: string,
  imagename?: string, // optional field
  imageUrl?: string, // optional field
};
