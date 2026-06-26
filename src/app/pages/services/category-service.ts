import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  // Todo- create and import base URL from .env file
  public readonly BASE_URL = 'http://localhost:8080';

  // new signal based DI instead of constructor injection
  http = inject(HttpClient);

  // Get Default Categories from backend API
  getDefaultCategories() {
    return this.http.get<any[]>(`${this.BASE_URL}/api/categories/default`);
  }

  getUserCategories(userId: number) {
    return this.http.get<any[]>(
      `${this.BASE_URL}/api/categories/user/${userId}`,
    );
  }

  // Post-Api - /add-category api to save new category data into DB
  addCategoryService(
    categoryRequest: CategoryRequest,
  ): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(
      `${this.BASE_URL}/api/categories/add-category`,
      categoryRequest,
    );
  }

  // Put-Api - /update-category api to update existing category data into DB
  updateCategoryService(
    categoryId: number,
    categoryRequest: CategoryRequest,
  ): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(
      `${this.BASE_URL}/api/categories/update-category/${categoryId}`,
      categoryRequest,
    );
  }

  // Delete-Api - /delete-category api to delete existing category from DB
  deleteCategoryService(categoryId: number): Observable<CategoryDeleteResponse> {
    return this.http.delete<CategoryDeleteResponse>(
      `${this.BASE_URL}/api/categories/delete-category/${categoryId}`,
    );
  }
}

// Type used for Api request object/Json which is send to backend for adding new category api
export type CategoryRequest = {
  userId: number;
  categoryName: string;
};

export type CategoryResponse = {
  categoryId: number;
  categoryName: string;
};

export type CategoryDeleteResponse = {
  success: boolean,
  message: string,
}
