import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable, of } from 'rxjs';
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
import { CookieService } from '../../../interceptors/cookie.service';
import { ConfirmationService } from 'primeng/api';

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
    CommonModule,
  ],
  templateUrl: './add-category.html',
  styleUrl: './add-category.scss',
})
export class AddCategory {
  private readonly matDialog = inject(MatDialog);
  private cookieService = inject(CookieService);
  private confirmationService = inject(ConfirmationService);

  categoryName = new FormControl<string>('', [Validators.required]);

  addCategoryForm: FormGroup;

  errorNotification = {
    show: false,
    type: '',
    text: '',
  };

  categories: CategoryResponse[] = [];
  // get user info from cookie which is stored after user logged-In
  userId = signal<string | null>(this.cookieService.getCookie('userId'));
  loading = signal(false);
  editingCategoryId = signal<number | null>(null);
  newCategoryName = '';
  actionTriggered = output<boolean>();
  categoriesData = input<Observable<CategoryResponse[]> | null>(null);
  // this below var is connected to p-table and it takes async data when api call is done and updates it in p-table
  categoriesDataObservable = computed<Observable<CategoryResponse[]>>(
    () => this.categoriesData() ?? of(this.categories),
  );

  constructor(
    private authService: AuthService,
    private categoryService: CategoryService,
    private router: Router,
  ) {
    this.addCategoryForm = new FormGroup({
      categoryName: this.categoryName,
    });
  }

  // this method calls the loadCategories() method in parent comp/add-collection and reload the categories array when ever any add/update/delete opeations is done
  notifyParent(value: boolean) {
    // Emit the event with optional data
    this.actionTriggered.emit(value);
  }

  addCategory() {
    // proceed further only if user is authenticated and addCategoryForm has no validation errors
    if (this.authService.isAuthenticated() && this.addCategoryForm.valid) {
      const userIdStr = this.cookieService.getCookie('userId');
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
          // reload the categories list by calling api method from parent comp after successful addition of new category
          this.notifyParent(true);
        },
        error: (err) => {
          console.error('Error adding category:', err);
          this.errorNotification = {
            show: true,
            type: 'error',
            text:
              err?.error?.message ||
              'Failed to add category. Please try again.',
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
  updateCategory(categoryId: number, newCategoryName: string, event: Event) {
    // if Confirm Popup is accepted(ok) then we proceed with updating categoryName and if rejected(no) then return/do nothing
    this.confirmationService.confirm({
      target: event.currentTarget as HTMLElement,
      message:
        'Are you sure you want to proceed? and once categoryName is updated then it will be reflected in all linked Collections Data also!',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'NO',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'YES',
      },
      accept: () => {
        this.editingCategoryId.set(null);
        if (
          this.authService.isAuthenticated() &&
          newCategoryName.trim() !== ''
        ) {
          const userIdStr = this.cookieService.getCookie('userId');
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
                this.errorNotification = {
                  show: true,
                  type: 'success',
                  text: 'Category Updated Successfully! Please check the Category List below to see the updated category.',
                };
                // Reload the categories list from parent comp after successful update
                this.notifyParent(true);
              },
              error: (err) => {
                console.error('Error updating category:', err);
                this.errorNotification = {
                  show: true,
                  type: 'error',
                  text:
                    err?.error?.message ||
                    'Failed to update category. Please try again.',
                };
              },
            });
        }
      },
      reject: () => {
        return; // do nothing
      },
    });
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
          if (deleted?.success) {
            // Reload the categories list after successful deletion
            this.notifyParent(true);
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
