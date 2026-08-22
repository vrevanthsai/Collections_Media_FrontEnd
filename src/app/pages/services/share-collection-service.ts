import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ShareCollectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/user';

  shareCollections(userId: number, request: ShareCollectionsRequest): Observable<ShareCollectionsResponse> {
    return this.http.post<ShareCollectionsResponse>(
      `${this.baseUrl}/${userId}/shares/share-collection`,
      request,
    );
  }
}

export interface ShareCollectionsRequest {
  collectionIds: number[];
  friendUserIds: number[];
}

export interface ShareCollectionsResponse {
  success: boolean;
  message: string;
  data: {
    totalSharesCreated: number;
    skippedOrPartialRecipients: string[];
  };
}
