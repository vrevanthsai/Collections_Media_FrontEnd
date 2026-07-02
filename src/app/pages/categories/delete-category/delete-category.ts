import { Component, inject, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../auth/services/auth';
import { ButtonModule } from 'primeng/button';
import { CategoryDeleteResponse, CategoryResponse, CategoryService } from '../../services/category-service';
import { CookieService } from '../../../interceptors/cookie.service';

@Component({
  selector: 'app-delete-category',
  imports: [ButtonModule],
  templateUrl: './delete-category.html',
  styleUrl: './delete-category.scss',
})
export class DeleteCategory {
  deleteResponse : CategoryDeleteResponse | null = null;
  private cookieService = inject(CookieService);

  constructor(
    // Getting Data from DialogREf of AddCategoryComponent
    @Inject(MAT_DIALOG_DATA) public data: { category : CategoryResponse },
    // Get current Dialog model reference
    private dialogRef: MatDialogRef<DeleteCategory>,
    private authService: AuthService,
    private categoryService: CategoryService,
  ) {}

  deleteCategory() {
    // Get userId from cookie to use in API calls
    const userId = parseInt(this.cookieService.getCookie('userId') || '0', 10);
    // proceed further only if user is authenticated
    if (this.authService.isAuthenticated()) {
      // Call Delete-Category-Api
      this.categoryService
        .deleteCategoryService(userId, this.data.category.categoryId!) // ! - it will not have null value
        .subscribe({
          next: (res) => {
            this.deleteResponse = res;
            // TODO- show String response-msg in Toaster/Notification-PopUp format instead of console.logs
            console.log(res);
          },
          error: (err) => {
            console.log('err from delete category api= ', err);
          },
          // Complete case
          complete: () => {
            // close dialog and pass true-boolean value to Home-comp to refresh getAll-api data after deleting
            this.dialogRef.close(this.deleteResponse);
          },
        });
    }
  }

  cancelDelete() {
    // Used for Closing the dialog- when user clicks cancel button in Dialog
    this.dialogRef.close();
  }
}
