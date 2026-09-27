import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminService, DefaultCategory } from '../services/admin.service';
import { CookieService } from '../../../../interceptors/cookie.service';
import { ConfirmPopupModule } from 'primeng/confirmpopup';

@Component({
  selector: 'app-default-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, ButtonModule, DialogModule, InputTextModule, ToastModule, ConfirmPopupModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './default-categories.component.html',
  styleUrls: ['./default-categories.component.scss']
})
export class DefaultCategoriesComponent implements OnInit {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  private confirmationService = inject(ConfirmationService);

  private cookieService = inject(CookieService);
  currentUserId = parseInt(this.cookieService.getCookie('userId') || '0', 10);

  loading = signal(false);
  categories = signal<DefaultCategory[]>([]);
  savingIds = signal<Set<number>>(new Set());

  dialogVisible = signal(false);
  dialogMode = signal<'add' | 'edit'>('add');
  saving = signal(false);
  private editingId: number | null = null;

  form: FormGroup = this.fb.group({
    categoryName: ['', [Validators.required, Validators.minLength(2)]]
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.adminService
      .getAllDefaultCategories(this.currentUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.loading.set(false);
          this.categories.set(items);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to load categories.' });
        }
      });
  }

  confirmEdit(event: Event, cat: DefaultCategory): void {
    this.confirmationService.confirm({
      target: event.currentTarget as EventTarget,
      message: 'Editing this category will update it across the entire application, for all users. Continue?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Edit', severity: 'warn' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.openEditDialog(cat)
    });
  }

  confirmToggleActive(event: Event, cat: DefaultCategory): void {
    if (cat.active) {
      // only deactivating needs a warning — activating back is low-risk
      this.confirmationService.confirm({
        target: event.currentTarget as EventTarget,
        message: `Deactivating "${cat.categoryName}" will hide it across the entire application, for all users. Continue?`,
        icon: 'pi pi-exclamation-triangle',
        acceptButtonProps: { label: 'Deactivate', severity: 'danger' },
        rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
        accept: () => this.toggleActive(cat)
      });
    } else {
      this.toggleActive(cat); // activating — no confirmation needed
    }
  }

  openAddDialog(): void {
    this.dialogMode.set('add');
    this.editingId = null;
    this.form.reset();
    this.dialogVisible.set(true);
  }

  openEditDialog(cat: DefaultCategory): void {
    this.dialogMode.set('edit');
    this.editingId = cat.id;
    this.form.setValue({ categoryName: cat.categoryName });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const categoryName = (this.form.value.categoryName as string).trim();
    this.saving.set(true);

    const request$ =
      this.dialogMode() === 'add'
        ? this.adminService.createDefaultCategory(this.currentUserId, categoryName)
        : this.adminService.updateDefaultCategory(this.currentUserId, this.editingId!, categoryName);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.dialogVisible.set(false);

        if (this.dialogMode() === 'add') {
          this.loadCategories();
          this.messageService.add({ severity: 'success', summary: 'Added', detail: 'Category created.' });
        } else {
          // manually update the category in the list- instead of reloading the entire list from backend
          this.categories.update((list) =>
            list.map((c) =>
              c.id === this.editingId ? { ...c, ...updated, id: c.id, categoryName } : c
            )
          );
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Category updated.' });
        }
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not save category.' });
      }
    });
  }

  toggleActive(cat: DefaultCategory): void {
    this.savingIds.update((set) => new Set(set).add(cat.id));

    const request$ = cat.active
      ? this.adminService.deactivateCategory(this.currentUserId, cat.id)
      : this.adminService.activateCategory(this.currentUserId, cat.id);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.categories.update((list) =>
          list.map((c) => (c.id === cat.id ? { ...c, active: !c.active } : c))
        );
        this.savingIds.update((set) => {
          const next = new Set(set);
          next.delete(cat.id);
          return next;
        });
        this.messageService.add({
          severity: 'success',
          summary: cat.active ? 'Deactivated' : 'Activated',
          detail: `"${cat.categoryName}" is now ${cat.active ? 'inactive' : 'active'}.`
        });
      },
      error: () => {
        this.savingIds.update((set) => {
          const next = new Set(set);
          next.delete(cat.id);
          return next;
        });
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not update status.' });
      }
    });
  }

  isSaving(id: number): boolean {
    return this.savingIds().has(id);
  }
}