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
}

// Type used for Api request object/Json which is send to backend for adding new category api
export type CategoryRequest = {
  userId: number;
  categoryName: string;
};

export type CategoryResponse = {
  categoryId: number;
  categoryName: string;
}
