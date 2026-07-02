import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../auth/services/auth';
import { Router } from '@angular/router';
import {
  CollectionDto,
  CollectionsService,
} from '../../services/collections-service';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { CategoryService, CategoryResponse } from '../../services/category-service';
import { TabsModule } from 'primeng/tabs';
import { AddCategory } from '../../categories/add-category/add-category';
import { MessageService } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from '../../../interceptors/cookie.service';

@Component({
  selector: 'app-add-collection',
  imports: [ReactiveFormsModule, CommonModule, SelectModule, TabsModule, AddCategory],
  templateUrl: './add-collection.html',
  styleUrl: './add-collection.scss',
})
export class AddCollection {
  private cookieService = inject(CookieService);
  // define form inputs
  // this all(6) are json/payload fields and they will be binded with their input-fields
  // remaining 3 fields(imagename, addedDate, userId) are not added from User-input, that will be added by this file logic
  name = new FormControl<string>('', [Validators.required]);
  category = new FormControl<string | null>(null, [Validators.required]);
  rating = new FormControl<number>(1, [
    Validators.required,
    Validators.min(1),
    Validators.max(5),
  ]);
  review = new FormControl<string>('', [Validators.required]);
  progress = new FormControl<string>('', [Validators.required]);
  privacy = new FormControl<string>('Public', [Validators.required]);

  // file/image form input
  selectedFile: File | null = null;

  // create form group to link with <form> in html
  addCollectionForm: FormGroup;

  // this var-object will be used to show error msg from backend if form submission fails
  errorNotification = {
    show: false,
    type: '',
    text: '',
  };

  // Collection Category-Type dynamic data
  categories: any[] = [];
  // this syntax format is used for sending async data safely from parent to child comp whenever new list is available after CRUD
  categoriesData$ = new BehaviorSubject<CategoryResponse[]>([]);

  // get user info from cookie which is stored after user logged-In
  userId = signal<string | null>(this.cookieService.getCookie('userId'));

  // Collection Progress-Dropdown Fixed data
  progressData = [
    { label: 'Started', value: 'Started' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Watching', value: 'Watching' },
    { label: 'OnHold', value: 'OnHold' },
  ];

  // Collection Privacy-Dropdown Fixed data
  privacyData = [
    { label: 'Public', value: 'Public' },
    { label: 'Private', value: 'Private' },
    { label: 'Friend', value: 'Friend' },
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private collectionService: CollectionsService,
    private categoryService: CategoryService,
    private messageService: MessageService
  ) {
    // bind form controls to form group
    this.addCollectionForm = this.formBuilder.group({
      // this key must match fields in the backend
      name: this.name,
      category: this.category,
      rating: this.rating,
      review: this.review, // TODO- make this field optional from Frontend logic
      progress: this.progress,
      privacy: this.privacy,
      // Non-User-input fields with their initial values
      imagename: [null ], // TODO- make this field optional from Frontend logic
    });
  }

  ngOnInit(): void {
    this.checkCategories();
  }

  // checks if categories list data is there or not in localStorage
  checkCategories(): void {
    // Load categories data from localStorage- if exists or recall categories api
    const localStorageCategories: any[] = JSON.parse(
      localStorage.getItem('categories') || '[]',
    );
    if (localStorageCategories.length > 0) {
      // var to send async data to child comp safely
      this.categoriesData$.next(localStorageCategories);
      let categoriesData = localStorageCategories.map((category) => ({
        label: category.categoryName,
        value: category.categoryId,
      }));
      this.categories = [...this.categories, ...categoriesData];
    } else {
      this.loadCategories();
    }
  }

  loadCategories(): void {
    let userId = parseInt(this.userId() || ''); // Convert to number, default to 0 if null

    if (!isNaN(userId)) {
      this.categoryService.getUserCategories(userId).subscribe({
        next: (data) => {
          // var to send async data to child comp safely
          this.categoriesData$.next(data);
          this.categories = data.map((category) => ({
            label: category.categoryName,
            value: category.categoryId,
          }));
          // store new categories list data whenever loadCategories() is recall from child for add,update,delete categories methods
          localStorage.setItem('categories', JSON.stringify(data));
        },
        error: (err) => {
          console.error(err);
        },
      });
    } else {
      console.error('Invalid userId: ', userId);
    }
  }

  // To recall and load latest categories list data whenever any CRUD is done in child comp/add-category and send latest list data
  parentMethod(value: boolean) {
    if(value){
      this.loadCategories();
    }
  }

  // File/Image handling Methods
  onFileSelected(event: any) {
    // uploaded image data is stored in this var and only one file selection is allowed[0]
    this.selectedFile = event.target.files[0];
    // patchValue()- Updates the Reactive Form control named file input-type field() in .html code
    this.addCollectionForm.patchValue({ file: this.selectedFile });
  }

  addCollection() {
    // proceed further only if user is authenticated and addCollectionForm has no validation errors
    if (this.authService.isAuthenticated() && this.addCollectionForm.valid) {
      // build payload/json data
      const collectionDto: CollectionDto = {
        name: this.addCollectionForm.get('name')?.value,
        category: this.addCollectionForm.get('category')?.value,
        userId: this.cookieService.getCookie('userId') || '',
        rating: this.addCollectionForm.get('rating')?.value,
        review: this.addCollectionForm.get('review')?.value,
        progress: this.addCollectionForm.get('progress')?.value,
        privacy: this.addCollectionForm.get('privacy')?.value,
        // we send current date as addedDate for every new collection created to the DB
        addedDate: new Date().toISOString(),
      };

      // Call Api service handler
      this.collectionService
        .addCollectionService(collectionDto, this.selectedFile)
        // selectedFile is needed/not null then use- !- means that this value will not be NULL but will have some value
        .subscribe({
          next: (res) => {
            console.log('response = ', res);
            this.errorNotification = {
              show: true,
              type: 'success',
              text: 'Collection Added Successfully! Please check latest data in Home page!',
            };
            // Show Toast notification for successful collection creation
            this.messageService.add({
              severity: 'success',
              summary: 'Collection created successfully!!',
              // detail: 'Check Home page for all Collections',
              life: 8000, // auto-dismiss after 3s
            });
            // reset form after successfull submission
            this.addCollectionForm.reset();
            // redirect to Home page
            this.router.navigate(['/home']);
          },
          error: (err) => {
            console.log('error = ', err);
            // navigate to same page if error occurs like to reset page
            this.router.navigate(['/collections/add-collection']);
            this.errorNotification = {
              show: true,
              type: 'error',
              text: err?.error?.message || 'Adding Collection failed, please try again!',
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
