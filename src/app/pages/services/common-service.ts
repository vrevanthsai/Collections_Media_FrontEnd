import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class CommonService {
  private http = inject(HttpClient);
  public readonly BASE_URL = 'http://localhost:8080';

  /**
   * Searches users/collections for the given logged-in user.
   * GET {baseUrl}/user/{userId}/profile/search-user-or-collection?query=...
   */
  searchUserOrCollection(
    userId: number,
    query: string,
  ): Observable<SearchResultItem[]> {
    const params = new HttpParams().set('query', query);
    return this.http
      .get<SearchApiResponse>(
        `${this.BASE_URL}/api/v1/user/${userId}/profile/search-user-or-collection`,
        { params },
      )
      .pipe(
        map((res) => {
          const users = (res.data?.users ?? []).map<SearchResultItem>((u) => ({
            id: u.userId,
            type: 'user',
            title: u.username,
            thumbnailUrl: u.imageName || '',
          }));

          const collections = (
            res.data?.collections ?? []
          ).map<SearchResultItem>((c) => ({
            id: c.collectionId,
            type: 'collection',
            title: c.collectionName,
            thumbnailUrl: this.resolveImage(c.imageName, userId),
          }));

          // users first, then collections — reorder if you'd rather interleave
          return [...users, ...collections];
        }),
      );
  }

  private resolveImage(imageName?: string, userId?: number): string {
    if (!imageName || imageName.trim() === '') {
      return ''; // fallback for blank imageName like "test2"/"test3"
    }
    return `${this.BASE_URL}/file/${imageName}/userId/${userId}`;
  }

  // Get Other User Avatar/Profile-pic image Api method
  getOtherUserAvatarImage(
    userId: number,
    otherUserId: number,
  ): Observable<Blob> {
    return this.http.get(
      `${this.BASE_URL}/api/v1/user/${userId}/profile/get-other-user-image/otheruser/${otherUserId}`,
      { responseType: 'blob' },
    );
  }

  getUserProfileView(
    currentUserId: number,
    viewUserId: number
  ): Observable<{ user: UserProfileUser; collections: UserProfileCollection[] }> {
    return this.http
      .get<UserProfileViewApiResponse>(
        `${this.BASE_URL}/api/v1/user/${currentUserId}/profile/user-view-page/${viewUserId}`
      )
      .pipe(map((res) => res.data));
  }
}

// ---- Raw API shapes ----
interface ApiCollection {
  collectionId: number;
  collectionName: string;
  imageName: string;
}

interface ApiUser {
  userId: number;
  username: string;
  imageName?: string;
}

interface SearchApiResponse {
  success: boolean;
  message: string;
  data: {
    users: ApiUser[];
    collections: ApiCollection[];
  };
}

// ---- Normalized shape the UI actually consumes ----
export interface SearchResultItem {
  id: number;
  type: 'user' | 'collection';
  title: string;
  thumbnailUrl: string;
  resolvedImageUrl?: string; // filled in after fetching, read-only in the template
}

// User View/Profile page types
export interface UserProfileUser {
  userId: number;
  username: string;
  name: string;
  imageName: string;
  addedDate: string;
}

export interface UserProfileCollection {
  collectionId: number;
  name: string;
  category: number;
  categoryName: string;
  userId: number;
  username: string;
  rating: number;
  review: string;
  progress: string;
  privacy: string;
  addedDate: string;
  imagename: string;
  imageUrl: string;
}

interface UserProfileViewApiResponse {
  success: boolean;
  message: string;
  data: {
    user: UserProfileUser;
    collections: UserProfileCollection[];
  };
}
