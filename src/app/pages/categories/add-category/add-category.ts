import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../auth/services/auth';
import {
  CategoryDeleteResponse,
  CategoryRequest,
  CategoryResponse,
  CategoryService,
} from '../../services/category-service';
import { Router } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MatDialog } from '@angular/material/dialog';
import { DeleteCategory } from '../delete-category/delete-category';

@Component({
  selector: 'app-add-category',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ProgressSpinnerModule,
    FormsModule,
    InputTextModule,
    TableModule,
    ButtonModule,
  ],
  templateUrl: './add-category.html',
  styleUrl: './add-category.scss',
})
export class AddCategory {
  private readonly matDialog = inject(MatDialog);

  categoryName = new FormControl<string>('', [Validators.required]);

  addCategoryForm: FormGroup;

  errorNotification = {
    show: false,
    type: '',
    text: '',
  };

  categories: CategoryResponse[] = [];
  // get user info from sessionStorage which is stored after user logged-In
  userId = signal<string | null>(sessionStorage.getItem('userId'));
  loading = signal(false);
  editingCategoryId = signal<number | null>(null);
  newCategoryName = '';

  constructor(
    private authService: AuthService,
    private categoryService: CategoryService,
    private router: Router,
  ) {
    this.addCategoryForm = new FormGroup({
      categoryName: this.categoryName,
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    let userId = parseInt(this.userId() || ''); // Convert to number, default to 0 if null

    if (!isNaN(userId)) {
      this.loading.set(true);
      this.categoryService.getUserCategories(userId).subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.categories = data;
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loading.set(false);
        },
      });
    } else {
      console.error('Invalid userId: ', userId);
    }
  }

  addCategory() {
    // proceed further only if user is authenticated and addCategoryForm has no validation errors
    if (this.authService.isAuthenticated() && this.addCategoryForm.valid) {
      const userIdStr = sessionStorage.getItem('userId');
      const userId = userIdStr ? parseInt(userIdStr, 10) : 0;
      const categoryRequest: CategoryRequest = {
        userId: userId,
        categoryName: this.addCategoryForm.get('categoryName')?.value || '',
      };

      this.categoryService.addCategoryService(categoryRequest).subscribe({
        next: (response) => {
          console.log('Category added successfully:', response);
          this.errorNotification = {
            show: true,
            type: 'success',
            text: 'Category Added Successfully! Please check the Category List below to see the newly added category.',
          };
          // reload the categories list after successful addition of new category
          this.loadCategories();
          // reset form after successfull submission
          this.addCategoryForm.reset();
        },
        error: (err) => {
          console.error('Error adding category:', err);
          this.errorNotification = {
            show: true,
            type: 'error',
            text: 'Failed to add category. Please try again.',
          };
        },
      });
    } else if (!this.authService.isAuthenticated()) {
      // if user is unAuthorized- then logout user and send him back to /login page with a error-notification msg
      this.authService.logout();
      this.router.navigate(['/login']);
      this.errorNotification = {
        show: true,
        type: 'error',
        text: 'Session expired! Please login again!',
      };
    } else {
      this.errorNotification = {
        show: true,
        type: 'validation errors',
        text: 'Please Enter all mandatory form fields!',
      };
    }
  }

  // Edit/Update category methods
  editCategory(categoryId: number, categoryName: string) {
    this.editingCategoryId.set(categoryId);
    this.newCategoryName = categoryName;
  }

  // Update category method
  updateCategory(categoryId: number, newCategoryName: string) {
    this.editingCategoryId.set(null);
    if (this.authService.isAuthenticated() && newCategoryName.trim() !== '') {
      const userIdStr = sessionStorage.getItem('userId');
      const userId = userIdStr ? parseInt(userIdStr, 10) : 0;
      const categoryRequest: CategoryRequest = {
        userId: userId,
        categoryName: newCategoryName,
      };

      this.categoryService
        .updateCategoryService(categoryId, categoryRequest)
        .subscribe({
          next: (response) => {
            console.log('Category updated successfully:', response);
            this.loadCategories(); // Reload the categories list after successful update
            this.errorNotification = {
              show: true,
              type: 'success',
              text: 'Category Updated Successfully! Please check the Category List below to see the updated category.',
            };
          },
          error: (err) => {
            console.error('Error updating category:', err);
            this.errorNotification = {
              show: true,
              type: 'error',
              text: 'Failed to update category. Please try again.',
            };
          },
        });
    }
  }

  cancelEdit() {
    this.editingCategoryId.set(null);
    this.newCategoryName = '';
  }

  isEditMode(categoryId: number): boolean {
    return this.editingCategoryId() === categoryId;
  }

  // Delete category method- Opens the delete confirmation popup and returns Add-category after deletion.
  deleteCategory(category: CategoryResponse) {
    if (!category.categoryId) {
      console.error('Invalid categoryId: ', category.categoryId);
      return;
    }

    this.matDialog
      .open(DeleteCategory, { data: { category } })
      .afterClosed()
      .subscribe({
        next: (deleted: CategoryDeleteResponse) => {
          // if category does not have any linked collection then only it will be deleted successfully and return success=true, else it will return success=false with a error-msg
          if (deleted?.success){
            this.loadCategories(); // Reload the categories list after successful deletion
            this.errorNotification = {
              show: true,
              type: 'success',
              text: deleted.message,
            };
          } else if (deleted?.success === false) {
            this.errorNotification = {
              show: true,
              type: 'error',
              text: deleted.message,
            };
          }
        },
        error: (error) => console.log('Delete dialog error = ', error),
      });
  }
}
