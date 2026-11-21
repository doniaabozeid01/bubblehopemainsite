import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getMessaging, getToken, isSupported, Messaging, onMessage } from 'firebase/messaging';
import { environment } from '../Environments/environment';
import { firebaseApp } from '../firebase-init';

const FCM_TOKEN_KEY = 'fcm_web_token';
const SW_URL = '/firebase-messaging-sw.js';
const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

/**
 * Account devices (pickup owner and driver) register after login.
 * The server sends the notification; this service only stores the browser token.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private messaging: Messaging | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private listening = false;
  private accountSync: Promise<void> | null = null;

  constructor(private http: HttpClient) {}

  /** After login, and when the site opens with a saved session. */
  syncAccountDevice(): void {
    if (!this.hasAuthToken()) return;
    if (this.accountSync) return;
    this.accountSync = this.registerAccount().finally(() => {
      this.accountSync = null;
    });
  }

  /** Logout. The request is started before the auth token is removed. */
  unregisterCurrentDevice(): void {
    const token = localStorage.getItem(FCM_TOKEN_KEY);
    if (!token) return;

    this.http.request('DELETE', `${environment.apiBaseUrl}/api/notifications/devices`, {
      body: { token }
    }).subscribe({
      next: () => localStorage.removeItem(FCM_TOKEN_KEY),
      error: () => localStorage.removeItem(FCM_TOKEN_KEY)
    });
  }

  private async registerAccount(): Promise<void> {
    const token = await this.obtainToken();
    if (!token || !this.hasAuthToken()) return;
    localStorage.setItem(FCM_TOKEN_KEY, token);

    this.http.post(`${environment.apiBaseUrl}/api/notifications/devices`, {
      token,
      platform: 'Web'
    }).subscribe({ error: () => {} });
  }

  private hasAuthToken(): boolean {
    const token = localStorage.getItem('token');
    return !!token && token !== 'null' && token !== 'undefined';
  }

  private async obtainToken(): Promise<string | null> {
    try {
      if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        return null;
      }
      if (Notification.permission === 'denied') return null;
      if (!(await isSupported())) return null;

      this.registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
      await this.activate(this.registration);
      const messaging = await this.messagingInstance();
      if (!messaging) return null;
      this.listen(messaging);

      const token = await getToken(messaging, {
        vapidKey: environment.firebase.vapidKey,
        serviceWorkerRegistration: this.registration
      });
      return token || null;
    } catch (err) {
      if (typeof Notification === 'undefined' || Notification.permission !== 'denied') {
        console.warn('Push registration skipped', err);
      }
      return null;
    }
  }

  private async activate(registration: ServiceWorkerRegistration): Promise<void> {
    if (registration.active) return;
    const worker = registration.installing || registration.waiting;
    if (!worker || worker.state === 'activated') return;

    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 8000);
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') {
          window.clearTimeout(timer);
          resolve();
        }
      });
    });
  }

  private async messagingInstance(): Promise<Messaging | null> {
    if (this.messaging) return this.messaging;
    if (!(await isSupported())) return null;
    this.messaging = getMessaging(firebaseApp);
    return this.messaging;
  }

  /** The browser does not show a notification while this tab is focused. */
  private listen(messaging: Messaging): void {
    if (this.listening) return;
    this.listening = true;

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.['title'] || 'Bubble Hope';
      const body = payload.notification?.body || payload.data?.['body'] || '';
      if (Notification.permission !== 'granted') return;

      const options: NotificationOptions = {
        body,
        icon: '/favicon.ico',
        data: payload.data
      };
      if (this.registration) {
        void this.registration.showNotification(title, options);
        return;
      }
      new Notification(title, options);
    });
  }
}
