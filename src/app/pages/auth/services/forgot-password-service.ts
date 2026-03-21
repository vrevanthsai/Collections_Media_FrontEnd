import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
// This file handles all(3) forgot-pwd Apis from backend
export class ForgotPasswordService {
  // Todo- create and import base URL from .env file
  public readonly BASE_URL = 'http://localhost:8080';

  http = inject(HttpClient);

  // 1st-Api - Verify Email- which sends OTP to provided email from User-input
  // observe:'response' is required when the component needs status/headers.
  verifyEmailService(email: string): Observable<HttpResponse<string>> {
    // we send nothing(null) as body- because in backend we handle logic based on provided PathVar(email) in URL instead of RequestBody logic
    return this.http.post(`${this.BASE_URL}/forgotPassword/verifyMail/${email}`, null, {
      observe: 'response',
      responseType: 'text',
    });
  }

  // 2nd-Api - Verify OTP from Users-input which he gets in his provided email-inbox
  verifyOtpService(otp: string, email: string): Observable<string> {
    return this.http.post<string>(`${this.BASE_URL}/forgotPassword/verifyOtp/${otp}/${email}`, null, {
      responseType: 'text' as 'json' // handles string type responses from backend
    });
  }

  // 3rd-Api - To handle changing password
  // here- method- parameters name should be same as backend-Api method-params and 1st contains Json-data which handles RequestBody logic in backend and 2nd-param used for URL-param logic
  changePasswordService(changePassword: ChangePasswordRequest, email: string): Observable<string> {
    return this.http.post<string>(`${this.BASE_URL}/forgotPassword/changePassword/${email}`, changePassword ,{
      responseType: 'text' as 'json'
    });
  }
}

// Type of 3rd-Api RequestBody expects
export type ChangePasswordRequest = {
  password: string,
  repeatPassword: string
}
