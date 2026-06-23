import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  // Todo- create and import base URL from .env file
  public readonly BASE_URL = 'http://localhost:8080';

  // new signal based DI instead of constructor injection
  http = inject(HttpClient);

  getUserCategories(userId: number) {
    return this.http.get<any[]>(
      `${this.BASE_URL}/api/categories/user/${userId}`,
    );
  }
}
