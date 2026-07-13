import {
  Component,
  computed,
  inject,
  OnInit,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import {
  AppUser,
  CookieUserDetails,
  ProfileService,
  UpdateUserRequest,
} from '../services/profile.service';
import { CookieService } from '../../../../interceptors/cookie.service';
import { AuthResponse } from '../../../auth/services/auth';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
  ],
  templateUrl: './profile-info.component.html',
  styleUrls: ['./profile-info.component.scss'],
  providers: [MessageService],
})
export class ProfileInfoComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  private cookieService = inject(CookieService);
  userId = parseInt(this.cookieService.getCookie('userId') || '0', 10);
  // get userDetails from Cookie if exists
  private userDetails: CookieUserDetails = JSON.parse(
    this.cookieService.getCookie('userDetails') || '{}',
  );
  user = signal<AppUser>({
    name: this.userDetails?.name || '',
    username: this.userDetails?.username || '',
    email: this.userDetails?.email || '',
    role: this.cookieService.getCookie('role') || 'USER',
    addedDate: this.userDetails?.addedDate || '',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112',
  });

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private profileService: ProfileService,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkIfUserDetailsExist();
  }

  // Initialize form with user data
  private initializeForm(): void {
    this.form = this.fb.group({
      email: [
        { value: this.user().email, disabled: true },
        [Validators.required, Validators.email],
      ],
      name: [this.user().name, Validators.required],
      username: [this.user().username, Validators.required],
    });
  }

  // this method checks Cookie storage of User browser and assigns User details
  // and if Cookie does not have data then calls loadUserDetails() which calls /getuser Api from BE and restores data
  checkIfUserDetailsExist(): void {
    if (
      this.user().name === '' &&
      this.user().name === undefined &&
      this.user().name === null
    ) {
      this.loadUserDetails();
    }
  }

  loadUserDetails(): void {
    this.profileService.getUserById(this.userId).subscribe({
      next: (res: AuthResponse) => {
        let currentUser$: AppUser = {
          name: res?.data?.name,
          username: res?.data?.username,
          email: res?.data?.email,
          role: this.cookieService.getCookie('role') || 'USER',
          addedDate: res?.data?.addedDate,
          avatarUrl:
            'https://api.dicebear.com/7.x/adventurer/svg?seed=rinku112',
        };
        this.user = signal(currentUser$);

        // Update form values with fetched user details
        this.form.patchValue({
          email: res?.data?.email,
          name: res?.data?.name,
          username: res?.data?.username,
        });

        // store userDetails in Cookie for future use
        let userDetails = {
          name: res.data.name,
          email: res.data.email,
          username: res.data.username,
          addedDate: res.data.addedDate,
        };
        this.cookieService.setCookie(
          'userDetails',
          JSON.stringify(userDetails),
          7,
        );

        // Send the updated user details to other components via ProfileService
        this.profileService.updateData(currentUser$);
      },
      error: (err: any) => {
        console.log('Error while fetching User Data baseed on UserId: ', err);
        this.messageService.add({
          severity: 'error',
          summary:
            err?.error?.message ||
            'Error while fetching User Data baseed on UserId',
          detail: 'Try again!',
          life: 3000, // auto-dismiss after 3s
        });
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      // this.auth.updateUser({ avatarUrl: reader.result as string });
      // this.profileService.updateAvatar({ avatarUrl: reader.result as string });
      this.user().avatarUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Build json/object data to send as Http request body to backend api
    const updatedUserData: UpdateUserRequest = {
      userId: this.userId,
      email: this.form.get('email')?.value,
      name: this.form.get('name')?.value,
      username: this.form.get('username')?.value,
    };

    // saving- is a loading var which shows loading in Submit/Save button itself/within
    this.saving = true;
    this.profileService.updateUserById(this.userId, updatedUserData).subscribe({
      next: (res: AuthResponse) => {
        this.saving = false;
        // show any Validation error msgs from backend
        if (!res?.success) {
          this.messageService.add({
            severity: 'error',
            summary: res?.message || 'Error while Updating User Data',
            detail: 'Try again!',
            life: 5000, // auto-dismiss after 3s
          });
        } else {
          // ReLoad latest User details and store the updated userDetails value in cookie
          this.loadUserDetails();
          this.messageService.add({
            severity: 'success',
            summary: 'Profile updated',
            detail: 'Your changes have been saved.',
          });
        }
      },
      error: (err: any) => {
        console.log('Error while Updating User Data: ', err);
        this.messageService.add({
          severity: 'error',
          summary: err?.error?.message || 'Error while Updating User Data',
          detail: 'Try again!',
          life: 3000, // auto-dismiss after 3s
        });
      },
    });
  }
}
