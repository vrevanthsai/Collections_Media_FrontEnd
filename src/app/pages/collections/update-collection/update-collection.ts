import { Component, Inject } from '@angular/core';
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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule, NgIf, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-update-collection',
  imports: [ReactiveFormsModule, CommonModule, SelectModule, NgIf],
  templateUrl: './update-collection.html',
  styleUrl: './update-collection.scss',
  providers: [TitleCasePipe], // Provide the pipe
})
// This component has similar logic as add-collection component
export class UpdateCollection {
  // define form inputs
  name: FormControl<string | null>;
  category: FormControl<string | null>;
  rating: FormControl<number | null>;
  review: FormControl<string | null>;
  progress: FormControl<string | null>;
  privacy: FormControl<string | null>;

  // define non-input required fields
  userId: string;
  addedDate: string;
  collectionId: number;
  imagename: string;

  // file/image form input
  selectedFile: File | null = null;

  // create form group to link with <form> in html
  updateCollectionForm: FormGroup;

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
    // Getting Data from DialogREf of HomeComponent
    @Inject(MAT_DIALOG_DATA) public data: { collection: CollectionDto },
    // Get current Dialog model reference
    private dialogRef: MatDialogRef<UpdateCollection>,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private collectionService: CollectionsService,
    private titleCasePipe: TitleCasePipe
  ) {
    // create local var to store incoming data
    const collection = this.data.collection;

    // Add incoming data as- initial values of each form-input
    this.name = new FormControl<string>(collection.name ?? '', [
      Validators.required,
    ]);
    this.category = new FormControl<string | null>(
      // Convert Category-value from Parent-comp from backend to Capital-Title case- so category-dropdown can auto-selct the value
      this.titleCasePipe.transform(collection.category) ?? null,
      [Validators.required],
    );
    this.rating = new FormControl<number>(collection.rating ?? 0, [
      Validators.required,
      Validators.min(0),
      Validators.max(5),
    ]);
    this.review = new FormControl<string>(collection.review ?? '', [
      Validators.required,
    ]);
    this.progress = new FormControl<string>(collection.progress ?? '', [
      Validators.required,
    ]);
    this.privacy = new FormControl<string>(collection.privacy ?? 'Public', [
      Validators.required,
    ]);

    // bind form controls to form group which has Initial data of collection which needs update from Home comp
    this.updateCollectionForm = this.formBuilder.group({
      // this key must match fields in the backend
      name: this.name,
      category: this.category,
      rating: this.rating,
      review: this.review, // TODO- make this field optional from Frontend logic
      progress: this.progress,
      privacy: this.privacy,
      // Non-User-input fields with their initial values
      imagename: [null], // TODO- make this field optional from Frontend logic
    });

    // Initialize non-input fields data
    this.userId = collection.userId ?? ''; // ?? - if data not there then take ""/empty string
    this.addedDate = collection.addedDate ?? '';
    this.collectionId = collection.collectionId!; // !- this must not be null value
    this.imagename = collection.imageUrl ?? '';
  }

  // File/Image handling Methods
  onFileSelected(event: any) {
    // uploaded image data is stored in this var and only one file selection is allowed[0]
    this.selectedFile = event.target.files[0];
    // patchValue()- Updates the Reactive Form control named file input-type field() in .html code
    this.updateCollectionForm.patchValue({ file: this.selectedFile });
  }

  updateCollection() {
    // proceed further only if user is authenticated and updateCollectionForm has no validation errors
    if (this.authService.isAuthenticated() && this.updateCollectionForm.valid) {
      // build payload/json data
      const collectionDto: CollectionDto = {
        name: this.updateCollectionForm.get('name')?.value,
        category: this.updateCollectionForm.get('category')?.value,
        userId: this.userId,
        rating: this.updateCollectionForm.get('rating')?.value,
        review: this.updateCollectionForm.get('review')?.value,
        progress: this.updateCollectionForm.get('progress')?.value,
        privacy: this.updateCollectionForm.get('privacy')?.value,
        addedDate: this.addedDate,
      };

      // Call Update-Collection Api
      this.collectionService
        .updateCollectionService(
          this.collectionId,
          collectionDto,
          this.selectedFile,
        )
        // !- means that this selectedFile value will not be NULL but will have some value
        .subscribe({
          // Success case
          next: (res) => {
            console.log('collection data after update: ', res);
            this.errorNotification = {
              show: true,
              type: "Success",
              text: "Collection Updated"
            }
          },
          // Error case
          error: (err) => {
            console.log('error = ', err);
            this.errorNotification = {
              show: true,
              type: 'error',
              text: 'Updating Collection failed, please try again!',
            };
          },
          // Completed case- this case runs only once when success case is done and no errors are there
          complete: () => {
            // close dialog and pass true-boolean value to Home-comp to refresh getAll-api data
            this.dialogRef.close(true);
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

  cancel() {
    // Used for Closing the dialog- when user clicks cancel button in Dialog
    this.dialogRef.close();
  }
}
