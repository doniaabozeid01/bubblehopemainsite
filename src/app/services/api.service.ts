import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Address, UserDetails } from '../Components/profile/profile.component';

@Injectable({
  providedIn: 'root'
})
export class ApiService {


  constructor(private http: HttpClient, private router: Router) { }


  baseUrl: string = "https://alhendalcompany-001-site1.stempurl.com";
  drinks: number = 1;
  rawMaterials: number = 2;
  
  
  GetAllAdvertisements(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Advertisements/GetAllAdvertisements`);
  }


  GetAllProducts(branchId: number, userId?: string, groupCategoryId?: number): Observable<any> {
    //return this.http.get(`${this.baseUrl}/api/Products/GetAllProducts`);
    //return this.http.get(`${this.baseUrl}/api/Stock/GetProductsForBranch?branchId=${branchId}`);
    return this.http.get(`${this.baseUrl}/api/Stock/GetProductsForBranch?branchId=${branchId}&userId=${userId}&groupCategoryId=${groupCategoryId}`);
  }


  GetAllProductsByCategoryId(
    branchId: number,
    opts?: { categoryId?: number; userId?: string; groupCategoryId?: number }
  ): Observable<any> {
    let params = new HttpParams().set('branchId', String(branchId));

    if (opts?.categoryId != null) params = params.set('categoryId', String(opts.categoryId));
    if (opts?.userId) params = params.set('userId', opts.userId);
    if (opts?.groupCategoryId) params = params.set('groupCategoryId', opts.groupCategoryId);

    return this.http.get<any>(`${this.baseUrl}/api/Stock/GetProducts`, { params });
  }


  addToCart(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/CartItems/AddCartItem`, data);
  }


  GetOrCreateCart(userId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Cart/GetOrCreateCart/${userId}`, {});
  }


  GetCartByUserIdAndBranchId(userId: string, branchId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Cart/GetCartByUserId/${userId}/${branchId}`);
  }


  GetUserId(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Account/getUserId`);
  }


  addToFavourite(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ProductFavourite/AddProductFavourite`, data);
  }


  GetProductFavouriteByUserId(userId: string, branchId: number): Observable<any> {
    // console.log(userId, branchId);
    return this.http.get(`${this.baseUrl}/api/ProductFavourite/GetProductFavouriteByUserId/${userId}?branchId=${branchId}`);
  }


  getGovernoratesByCountryId(countryId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Location/GetGovernoratesByCountryId/${countryId}`);
  }


  getCitiesByGovernorateId(govId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Location/GetCitiesByGovernorateId/${govId}`);
  }


  getDistrictsByCityId(cityId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Location/GetDistrictsByCityId/${cityId}`);
  }


  getAllCountries(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Location/GetAllCountries`);
  }


  GetAllPaymentMethods(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/PaymentMethods/GetAllPaymentMethods`);
  }


  createOrder(order: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Orders/CreateOrder`, order);
  }


  CreateOrderPaymob(order: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Orders/CreateOrderPaymob`, order);
  }


  GetOrderById(orderId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Orders/GetOrderByOrderId/${orderId}`);
  }


  GetCartItemByCartId(cartId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/CartItems/GetCartItemById/${cartId}`);
  }


  getOrdersByUserId(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Orders/GetOrdersByUserId/${userId}`);
  }


  cancelOrder(orderId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/Orders/CancelOrder/${orderId}`, {});
  }

  
  getAllCategories(groupId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Categories/GetAllCategories?categoryGroupId=${groupId}`);
  }


  GetProductById(prodId: number, branchId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Products/GetProductById/${prodId}/Branch/${branchId}`);
  }

  
  contactUs(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ContactUs`, data);
  }


  UpdateCartItem(id: number, quantity: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/CartItems/UpdateCartItem/${id}?quantity=${quantity}`, {});
  }


  DeleteCartItem(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/CartItems/DeleteCartItem/${id}`);
  }


  ClearCart(cartId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/CartItems/ClearCart/${cartId}`);
  }


  removeFromFavourite(productId: number, branchId: number, userId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/ProductFavourite/DeleteProductFromFavourite?productId=${productId}&branchId=${branchId}&userId=${userId}`);
  }


  GetProductFavouriteByUserIdAndProductId(userId: string, prodId: number, branchId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/ProductFavourite/GetProductFavouriteByUserIdAndProductId/${userId}?productId=${prodId}&branchId=${branchId}`);
  }


  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Account/resetPassword`, data);
  }


  forgetPassword(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Account/forgotPassword`, data);
  }


  getGroupedProducts(branchId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Products/GetGroupedProductsWithStock/${branchId}`);
  }


  getAllBranches(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Branch/GetAllBranches`);
  }


  switchBranch(branch: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Branch/Switch`, branch);
  }


  GetUserBranch(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Branch/GetUserBranch/${userId}`);
  }


  GetDefaultBranch(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Branch/GetDefaultBranch`);
  }


  GetProductByName(name: string, branchId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Products/GetProductByName/${name}/Branch/${branchId}`);
  }


  checkDiscountCode(discountCode: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/DiscountControllers/GetDiscountByCode/${discountCode}`);
  }


  GetBestSellerProducts(branchId: number, userId?: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Products/GetBestSellerProducts?branchId=${branchId}&userId=${userId}`);
  }


  rejectEmail(confirmationId: string): Observable<any> {

    return this.http.get(`${this.baseUrl}/api/Account/rejectEmail/${confirmationId}`);
  }


  confirmEmail(confirmationId: string): Observable<any> {

    return this.http.get(`${this.baseUrl}/api/Account/confirmEmail/${confirmationId}`);
  }


  resendConfirmation(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Account/resend-confirmation`, email);
  }


  checkDiscountValidation(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/DiscountControllers/CheckDiscountAvailability`, data, {
      withCredentials: true//<--مهم جداً
    });
  }


  getUserDetails(userId: string): Observable<any> {
    return this.http.get<UserDetails>(
      `${this.baseUrl}/api/Account/getUserDetails/${userId}`
    );
  }


  updateProfile(payload: { fullName: string; phoneNumber: string | null }): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/Account/update-profile`, payload);
  }


  GetUserAddresses(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/UserAddresses/GetAll`);
  }


  addAddress( payload: Partial<Address>): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/UserAddresses/Add`, payload);
  }


  deleteAddress(addressId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/UserAddresses/Delete/${addressId}`);
  }


  setDefaultAddress (addressId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/UserAddresses/SetDefault/${addressId}/default`, {});
  }



  GetProductsByAdvertisementId(AdvertiseId: number , branchId: number, userId?: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/Advertisements/GetAdvertisementProductsByBranch?advertiseId=${AdvertiseId}&branchId=${branchId}&userId=${userId}`);
  }

}