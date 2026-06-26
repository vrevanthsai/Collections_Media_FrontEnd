import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../auth/services/auth';
import {
  CategoryRequest,
  CategoryService,
} from '../../services/category-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-category',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-category.html',
  styleUrl: './add-category.scss',
})
export class AddCategory {
  categoryName = new FormControl<string>('', [Validators.required]);

  addCategoryForm: FormGroup;

  errorNotification = {
    show: false,
    type: '',
    text: '',
  };

  constructor(
    private authService: AuthService,
    private categoryService: CategoryService,
    private router: Router,
  ) {
    this.addCategoryForm = new FormGroup({
      categoryName: this.categoryName,
    });
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
}
