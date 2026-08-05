import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private http = inject(HttpClient);
  public readonly BASE_URL = 'http://localhost:8080/api/v1/user';

  getAllNotifications(userId: number): Observable<NotificationItem[]> {
    return this.http
      .get<NotificationsApiResponse>(`${this.BASE_URL}/${userId}/notifications/get-all-notifications`)
      .pipe(map((res) => res.data ?? []));
  }

  getUnreadNotificationsCount(userId: number): Observable<NotificationCount> {
    return this.http.get<NotificationCount>(`${this.BASE_URL}/${userId}/notifications/unread-count`);
  }
}

// get All notifications types
export interface NotificationItem {
  id: number;
  type: string;
  referenceId: number;
  createdAt: string;
  actorUserId: number;
  actorUsername: string;
  actorName: string;
  actorImageName: string;
  read: boolean;
}

interface NotificationsApiResponse {
  success: boolean;
  message: string;
  data: NotificationItem[];
}

// Notifications Count Type
export interface NotificationCount {
  success: string;
  message: string;
  data: number;
}
