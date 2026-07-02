import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CookieService {

  setCookie(name: string, value: string, expireDays: number): void {
    const date = new Date();
    date.setTime(date.getTime() + expireDays * 24 * 60 * 60 * 1000); // expiry in days
    // encodeURIComponent -make this string safe to store- converts json like value to string safe - converts those special characters into a safe, percent-encoded format.
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Strict`;
  }

  getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    // decodeURIComponent - turn it back into the readable string- converts string back to json format
    return match ? decodeURIComponent(match[2]) : null;
  }

  deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }
}