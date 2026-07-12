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
import { AppUser, ProfileService } from '../services/profile.service';
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
  // user = signal({});
  user!: Signal<AppUser>;
  form!: FormGroup;
  saving = false;
  private cookieService = inject(CookieService);

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private profileService: ProfileService,
  ) {}

  ngOnInit(): void {
    this.user = this.profileService?.currentUser;
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
      this.profileService.currentUser().name !== '' &&
      this.profileService.currentUser().name !== undefined &&
      this.profileService.currentUser().name !== null
    ) {
      // this.user = signal(this.profileService.currentUser());
      this.user = computed(() => this.profileService.currentUser());
    } else {
      this.loadUserDetails();
    }
  }

  loadUserDetails(): void {
    const userId = parseInt(this.cookieService.getCookie('userId') || '0', 10);
    this.profileService.getUserById(userId).subscribe({
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
        this.profileService.reAssignUserDetails = true;
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

    this.saving = true;
    setTimeout(() => {
      // this.auth.updateUser({ username: this.form.value.username });
      this.saving = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Profile updated',
        detail: 'Your changes have been saved.',
      });
    }, 600);
  }
}
