import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CookieService {
  // generate your secretKey(string vlaue)- using node command - node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  private readonly secretKey = environment.cookieSecretKey;

  private encrypt(value: string): string {
    return CryptoJS.AES.encrypt(value, this.secretKey).toString();
  }

  private decrypt(value: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(value, this.secretKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return '';
    }
  }

   // --- Plain (unencrypted) cookie methods ---
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

  // --- Encrypted cookie methods ---
  setEncryptedCookie(name: string, value: string, expireDays: number): void {
    const encryptedValue = this.encrypt(value);
    this.setCookie(name, encryptedValue, expireDays);
  }

  getEncryptedCookie(name: string): string | null {
    const raw = this.getCookie(name);
    if (!raw) return null;

    const decrypted = this.decrypt(raw);
    return decrypted || null;
  }

  deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }
}