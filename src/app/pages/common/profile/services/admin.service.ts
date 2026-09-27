import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  public readonly BASE_URL = 'http://localhost:8080/api/v1/user';

  getAllDefaultCategories(userId: number): Observable<DefaultCategory[]> {
    return this.http
      .get<DefaultCategoriesApiResponse>(`${this.BASE_URL}/${userId}/admin/get-all-default-categories`)
      .pipe(map((res) => res.data ?? []));
  }

  createDefaultCategory(userId: number, categoryName: string): Observable<SingleCategoryApiResponse> {
    return this.http
      .post<SingleCategoryApiResponse>(
        `${this.BASE_URL}/${userId}/admin/create-default-category`,
        {}, {
        params: {
          name: categoryName // sending data to backend in the form of Http-params- not body- name key is same api-method-param-name in backend
        }
      }
      );
  }

  updateDefaultCategory(userId: number, id: number, categoryName: string): Observable<SingleCategoryApiResponse> {
    return this.http
      .patch<SingleCategoryApiResponse>(
        `${this.BASE_URL}/${userId}/admin/update-default-category/${id}`,
        {}, {
        params: {
          newName: categoryName // sending data to backend in the form of Http-params- not body
        }
      }
      );
  }

  activateCategory(userId: number, id: number): Observable<void> {
    return this.http
      .patch<SingleCategoryApiResponse>(
        `${this.BASE_URL}/${userId}/admin/default-category/${id}/activate`,
        {}
      )
      .pipe(map(() => void 0));
  }

  deactivateCategory(userId: number, id: number): Observable<void> {
    return this.http
      .patch<SingleCategoryApiResponse>(
        `${this.BASE_URL}/${userId}/admin/default-category/${id}/deactivate`,
        {}
      )
      .pipe(map(() => void 0));
  }
}

export interface DefaultCategory {
  id: number;
  categoryName: string;
  active: boolean;
}

interface DefaultCategoriesApiResponse {
  success: boolean;
  message: string;
  data: DefaultCategory[];
}

interface SingleCategoryApiResponse {
  success: boolean;
  message: string;
  data: string;
}