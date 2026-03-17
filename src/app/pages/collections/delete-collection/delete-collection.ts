import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CollectionDto, CollectionsService } from '../../services/collections-service';
import { AuthService } from '../../auth/services/auth';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-delete-collection',
  imports: [ButtonModule],
  templateUrl: './delete-collection.html',
  styleUrl: './delete-collection.scss',
})
export class DeleteCollection {

  constructor(
    // Getting Data from DialogREf of HomeComponent
    @Inject(MAT_DIALOG_DATA) public data: { collection: CollectionDto },
    // Get current Dialog model reference
    private dialogRef: MatDialogRef<DeleteCollection>,
    private authService: AuthService,
    private collectionService: CollectionsService,
  ) {}

  deleteCollection() {
    // proceed further only if user is authenticated
    if (this.authService.isAuthenticated()) {
      // Call Delete-Collection-Api
      this.collectionService.deleteCollectionService(this.data.collection.collectionId!) // ! - it will not have null value
      .subscribe({
        next: (res) => {
          // TODO- show String response-msg in Toaster/Notification-PopUp format instead of console.logs
          console.log(res);
        },
        error: (err) => {
          console.log("err from delete collection api= ", err);
        },
        // Complete case
        complete: () => {
          // close dialog and pass true-boolean value to Home-comp to refresh getAll-api data after deleting
          this.dialogRef.close(true);
        }
      })
    }
  }

  cancelDelete(){
    // Used for Closing the dialog- when user clicks cancel button in Dialog
    this.dialogRef.close();
  }
}
