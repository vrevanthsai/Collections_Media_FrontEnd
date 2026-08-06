import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FriendConnectionService {
  private http = inject(HttpClient);
  public readonly BASE_URL = 'http://localhost:8080/api/v1/user';

  sendFriendRequest(currentUserId: number, otherUserId: number | undefined): Observable<FriendResquestResponse> {
    // here currentUser is sending request to otherUser and otherUser receives notificaiton of this friend request from currentUser
    return this.http.post<FriendResquestResponse>(`${this.BASE_URL}/${currentUserId}/friends/request/${otherUserId}`, {}); // body not needed in backend logic
  }

  checkFriendConnection(currentUserId: number, otherUserId: number | undefined): Observable<CheckFriendConnectionResponse> {
    return this.http.get<CheckFriendConnectionResponse>(`${this.BASE_URL}/${currentUserId}/friends/check-friend-connection-status/${otherUserId}`);
  }

  // only respond as- Accepted or Rejected
  friendRequestAction(currentUserId: number, connectionId: number, action: 'ACCEPTED' | 'REJECTED'): Observable<FriendResquestResponse> {
    return this.http.patch<FriendResquestResponse>(`${this.BASE_URL}/${currentUserId}/friends/respond/${connectionId}`, {}, {
      params: {
        action: action // sending data to backend in the form of Http-params- not body
      }
    });
  }
}

export interface FriendResquestResponse {
  success: boolean;
  message: string;
  data: string;
}

export interface CheckFriendConnectionResponse {
  success: boolean;
  message: string;
  data: FriendConnectionDto;
}

export interface FriendConnectionDto {
  connectionId: number;
  requesterId: number;
  receiverId: number;
  status: string;
}