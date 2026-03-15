import { Component } from '@angular/core';
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

@Component({
  selector: 'app-add-collection',
  imports: [ReactiveFormsModule, CommonModule, SelectModule],
  templateUrl: './add-collection.html',
  styleUrl: './add-collection.scss',
})
export class AddCollection {
  // define form inputs
  // this all(6) are json/payload fields and they will be binded with their input-fields
  // remaining 3 fields(imagename, addedDate, userId) are not added from User-input, that will be added by this file logic
  name = new FormControl<string>('', [Validators.required]);
  category = new FormControl<string | null>(null, [Validators.required]);
  rating = new FormControl<number>(0, [
    Validators.required,
    Validators.min(0),
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

  // Collection Category-Type Default-Manual data
  categories = [
    { label: 'Anime', value: 'Anime' },
    { label: 'Movie', value: 'Movie' },
    { label: 'Manga', value: 'Manga' },
    { label: 'Manhwa', value: 'Manhwa' },
  ];

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
      imagename: [null, Validators.required], // TODO- make this field optional from Frontend logic
      // addedDate: ['', Validators.required],
      // userId: ['', Validators.required],
    });
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
        userId: sessionStorage.getItem('userId') || '',
        rating: this.addCollectionForm.get('rating')?.value,
        review: this.addCollectionForm.get('review')?.value,
        progress: this.addCollectionForm.get('progress')?.value,
        privacy: this.addCollectionForm.get('privacy')?.value,
        // we send current date as addedDate for every new collection created to the DB
        addedDate: new Date().toISOString(),
      };

      // Call Api service handler
      this.collectionService
        .addCollectionService(collectionDto, this.selectedFile!)
        // !- means that this value will not be NULL but will have some value
        .subscribe({
          next: (res) => {
            console.log('response = ', res);
            // reset form after successfull submission
            this.addCollectionForm.reset();
          },
          error: (err) => {
            console.log('error = ', err);
            // navigate to same page if error occurs like to reset page
            this.router.navigate(['add-collection']);
            this.errorNotification = {
              show: true,
              type: 'error',
              text: 'Adding Collection failed, please try again!',
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
