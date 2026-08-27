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

  updateShareActionStatus(shareId: number, actionStatus: ShareActionStatus, currentUserId: number) {
    const params = new HttpParams().set('status', actionStatus); // 'status' is same name in backend Api method for Params
    return this.http.patch<ActionStatusResponse>(`${this.baseUrl}/${currentUserId}/shares/${shareId}/action`, {}, { params }); // {} body must be there for Post and Patch requests, even if empty, otherwise it will throw error when using along with params
  }

  updateWatchListStatus(shareId: number, isWatchList: boolean, currentUserId: number) {
    const params = new HttpParams().set('isWatchList', isWatchList.toString()); // 'status' is same name in backend Api method for Params
    return this.http.patch<ActionStatusResponse>(`${this.baseUrl}/${currentUserId}/shares/${shareId}/watch-list`, {}, { params }); // {} body must be there for Post and Patch requests, even if empty, otherwise it will throw error when using along with params
  }

  // Mark clicked shared/recommended collection as viewed
  markViewed(userId: number, shareId: number): Observable<ActionStatusResponse> {
    return this.http.patch<ActionStatusResponse>(`${this.baseUrl}/${userId}/shares/${shareId}/viewed`, {}); // empty body- body not needed in backend logic
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

export type ShareTabType = 'SHARE_WITH_ME' | 'SHARE_BY_ME' | 'MY_WATCH_LIST';

export interface SharedCollectionItem {
  shareId: number;
  collectionId: number;
  collectionName: string;
  categoryName: string;
  sharedByUsername: string;
  sharedAt: string;
  actionStatus: string;
  viewed: boolean;
  addedToWatchlist: boolean;
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

export type ShareActionStatus = 'PENDING' | 'LIKED' | 'DISMISSED';

export interface ActionStatusResponse {
  success: boolean;
  message: string;
  data: string;
}