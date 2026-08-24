import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

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

  getRecommendations(userId: number, tabType: ShareTabType): Observable<ShareGroup[]> {
    const params = new HttpParams().set('tabType', tabType);
    return this.http
      .get<RecommendationsApiResponse>(`${this.baseUrl}/${userId}/shares/get-recommendations`, { params })
      .pipe(map((res) => res.data ?? []));
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

export type ShareTabType = 'SHARE_WITH_ME' | 'SHARE_BY_ME';

export interface SharedCollectionItem {
  shareId: number;
  collectionId: number;
  collectionName: string;
  categoryName: string;
  sharedByUsername: string;
  sharedAt: string;
  actionStatus: string;
  viewed: boolean;
}

export interface ShareGroup {
  sharedByUserId: number;
  sharedByUsername: string;
  sharedByImageName: string;
  collectionCount: number;
  latestSharedAt: string;
  collections: SharedCollectionItem[];
}

interface RecommendationsApiResponse {
  success: boolean;
  message: string;
  data: ShareGroup[];
}
