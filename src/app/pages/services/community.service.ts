import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CommunityCollection {
    collectionId: number;
    name: string;
    categoryId: number;
    categoryName: string;
    defaultCategoryId: number | null;
    userId: number;
    username: string;
    rating: number;
    progress: string;
    addedDate: string;
}

export interface DefaultCategoryOption {
    categoryId: number;
    categoryName: string;
    editable: boolean;
}

interface CommunityCollectionsApiResponse {
    success: boolean;
    message: string;
    data: CommunityCollection[];
}

@Injectable({ providedIn: 'root' })
export class CommunityService {
    private http = inject(HttpClient);
    public readonly BASE_URL = 'http://localhost:8080/api/v1';

    getPublicCollections(userId: number): Observable<CommunityCollection[]> {
        return this.http
            .get<CommunityCollectionsApiResponse>(`${this.BASE_URL}/user/${userId}/community/get-public-collections`)
            .pipe(map((res) => res.data ?? []));
    }

    getDefaultCategories(): Observable<DefaultCategoryOption[]> {
        return this.http.get<DefaultCategoryOption[]>(`${this.BASE_URL}/auth/get-default-categories`);
    }
}