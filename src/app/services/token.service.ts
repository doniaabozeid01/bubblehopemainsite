import * as CryptoJS from 'crypto-js';
import { Injectable, Injector } from '@angular/core';
import { PushNotificationService } from './push-notification.service';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  private secretKey = 'your-32-character-secret-key'; // خليها ثابتة بس متشاركيهاش برا

  constructor(private injector: Injector) {}

  storeEncryptedToken(token: string) {
    const encrypted = CryptoJS.AES.encrypt(token, this.secretKey).toString();
    localStorage.setItem('token', encrypted);
    this.injector.get(PushNotificationService).syncAccountDevice();
  }

  getDecryptedToken(): string | null {
    const encrypted = localStorage.getItem('token');
    if (!encrypted) return null;

    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      // console.log("decrypted : ", decrypted);

      return decrypted;
    } catch (e) {
      console.error('Decryption failed', e);
      return null;
    }
  }

  removeToken() {
    localStorage.removeItem('token');
  }

  /** `exp` claim of the stored JWT in milliseconds, or null if it can't be read. */
  getExpiryMs(): number | null {
    const jwt = this.getDecryptedToken();
    const parts = jwt ? jwt.split('.') : [];
    if (parts.length !== 3) return null;

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(decodeURIComponent(escape(atob(padded))));
      const exp = Number(payload?.exp);
      return Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
    } catch {
      return null;
    }
  }

  /**
   * True when a token is stored and its `exp` has passed (with a small safety margin).
   * A token without a readable `exp` is treated as still valid; the server's 401 handles it.
   */
  isExpired(skewMs = 10_000): boolean {
    if (!localStorage.getItem('token')) return false;
    const expiry = this.getExpiryMs();
    return expiry !== null && Date.now() >= expiry - skewMs;
  }

  hasToken(): boolean {
    return !!this.getDecryptedToken();
  }
}
