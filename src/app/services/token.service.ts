import * as CryptoJS from 'crypto-js';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  private secretKey = 'your-32-character-secret-key'; // خليها ثابتة بس متشاركيهاش برا

  storeEncryptedToken(token: string) {
    const encrypted = CryptoJS.AES.encrypt(token, this.secretKey).toString();
    localStorage.setItem('token', encrypted);
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
