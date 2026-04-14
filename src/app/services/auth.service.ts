import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // private baseUrl = environment.baseUrl;
  baseUrl: string = "https://alhendalcompany-001-site1.stempurl.com";


  constructor(private httpClient: HttpClient) { 
        this.loadUserFromStorage(); // مهم: استدعاء هنا عشان يشتغل بعد كل refresh

  }

  register(userData: any): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/api/Account/userRegister`, userData);

  }

  login(userData: any): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/api/Account/login`, userData);
  }
  getUserId(): Observable<any> {
    return this.httpClient.get(`${this.baseUrl}/api/Account/getUserId`);
  }

  getFullName(): Observable<any> {
    return this.httpClient.get(`${this.baseUrl}/api/Account/getFullName`);
  }

  changePassword(data: any): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/api/Account/changePassword`, data);
  }

  forgotPassword(data: any): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/api/Account/forgotPassword`, data);
  }

  resetPassword(data: any): Observable<any> {
    return this.httpClient.post(`${this.baseUrl}/api/Account/resetPassword`, data);
  }

  getUserDetails(userId: string): Observable<any> {
    return this.httpClient.get(`${this.baseUrl}/api/Account/getUserDetails/${userId}`);
  }
  // 🟩 تخزين التوكن
  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // 🟦 جلب التوكن
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // ❌ حذف التوكن (عند تسجيل الخروج)
  clearToken(): void {
    localStorage.removeItem('token');
  }

  // ✅ معرفة هل المستخدم مسجل دخول
  isLoggedIn(): boolean {
    return !!this.getToken();
  }




  private userSource = new BehaviorSubject<any>(null); // null = مفيش يوزر
  currentUser$ = this.userSource.asObservable();


  signIn(user: any) {
    this.userSource.next(user);
    localStorage.setItem('user', JSON.stringify(user)); // تخزين في localStorage
  }

  loadUserFromStorage() {
    const user = localStorage.getItem('user');
    if (user) {
      this.userSource.next(JSON.parse(user));
    }
  }


   logout() {
    this.userSource.next(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

}
