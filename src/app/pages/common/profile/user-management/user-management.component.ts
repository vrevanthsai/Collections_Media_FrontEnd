import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

interface ManagedUser {
  id: number;
  username: string;
  email: string;
  role: 'Admin' | 'User';
  status: 'Active' | 'Suspended';
  joined: Date;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent {
  searchTerm = '';

  users: ManagedUser[] = [
    { id: 1, username: 'rinku112', email: 'rinkurevanth3@gmail.com', role: 'Admin', status: 'Active', joined: new Date('2026-04-21') },
    { id: 2, username: 'aria_watch', email: 'aria@example.com', role: 'User', status: 'Active', joined: new Date('2026-05-02') },
    { id: 3, username: 'kenji88', email: 'kenji88@example.com', role: 'User', status: 'Suspended', joined: new Date('2026-05-14') },
    { id: 4, username: 'maya_streams', email: 'maya@example.com', role: 'User', status: 'Active', joined: new Date('2026-06-01') }
  ];

  get filteredUsers(): ManagedUser[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.users;
    return this.users.filter(
      (u) => u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );
  }

  toggleStatus(user: ManagedUser): void {
    user.status = user.status === 'Active' ? 'Suspended' : 'Active';
  }
}
