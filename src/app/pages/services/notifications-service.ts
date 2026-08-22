import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private http = inject(HttpClient);
  public readonly BASE_URL = 'http://localhost:8080/api/v1/user';
  // notification status sharable var between notification page vs navbar comps
  private notificationsSubject = new BehaviorSubject<boolean>(false);
  notificationsStatus$ = this.notificationsSubject.asObservable();

  updateNotificationStatus(status: boolean) {
    this.notificationsSubject.next(status);
  }

  getAllNotifications(userId: number): Observable<NotificationItem[]> {
    return this.http
      .get<NotificationsApiResponse>(`${this.BASE_URL}/${userId}/notifications/get-all-notifications`)
      .pipe(map((res) => res.data ?? []));
  }

  getUnreadNotificationsCount(userId: number): Observable<NotificationCount> {
    return this.http.get<NotificationCount>(`${this.BASE_URL}/${userId}/notifications/unread-count`);
  }

  // Mark single notification as Read
  markReadSingleNotification(userId: number, notificationId: number): Observable<MarkReadNotificationResponse> {
    return this.http.patch<MarkReadNotificationResponse>(`${this.BASE_URL}/${userId}/notifications/${notificationId}/read`, {}); // empty body- body not needed in backend logic
  }

  // Mark All notification as Read
  markReadAllNotification(userId: number): Observable<MarkReadNotificationResponse> {
    return this.http.patch<MarkReadNotificationResponse>(`${this.BASE_URL}/${userId}/notifications/read-all`, {}); // empty body- body not needed in backend logic
  }

  // Delete single notification
  deleteNotification(userId: number, notificationId: number): Observable<void> {
    return this.http
      .delete<{ success: boolean; message: string }>(
        `${this.BASE_URL}/${userId}/notifications/delete-notification/${notificationId}`
      )
      .pipe(map(() => void 0));
  }
}

// get All notifications types
export interface NotificationItem {
  id: number;
  type: string;
  referenceId: number;
  sharesCount?: number; // optional or null
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

// Mark as Read Notificaiton response type
export interface MarkReadNotificationResponse {
  success: string;
  message: string;
  data: string;
}