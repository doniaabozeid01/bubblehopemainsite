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

  hasToken(): boolean {
    return !!this.getDecryptedToken();
  }
}
