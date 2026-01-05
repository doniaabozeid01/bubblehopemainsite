import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../Environments/environment';

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';

import { firebaseAuth } from '../firebase-init';

@Injectable({ providedIn: 'root' })
export class PhoneAuthService {
  private confirmationResult?: ConfirmationResult;
  private recaptcha?: RecaptchaVerifier;

  constructor(private http: HttpClient) {}

  initRecaptcha(containerId: string) {
    if (this.recaptcha) return;

    // ✅ Firebase v9+ signature: (auth, container, options)
    this.recaptcha = new RecaptchaVerifier(
      firebaseAuth,
      containerId,
      { size: 'invisible' }
    );
  }

  async sendOtp(phoneE164: string): Promise<void> {
    if (!this.recaptcha) throw new Error('reCAPTCHA not initialized');
    this.confirmationResult = await signInWithPhoneNumber(firebaseAuth, phoneE164, this.recaptcha);
  }

  async verifyOtp(code: string): Promise<string> {
    if (!this.confirmationResult) throw new Error('No OTP session found');
    const cred = await this.confirmationResult.confirm(code);
    return await cred.user.getIdToken(true);
  }

  backendLogin(idToken: string, fullName?: string) {
    return this.http.post<any>(
      `${environment.apiBaseUrl}/api/Account/firebase/phone-login`,
      { idToken, fullName }
    );
  }
}
