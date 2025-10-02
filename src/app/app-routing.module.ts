import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthLayoutComponent } from './Components/Layouts/auth-layout/auth-layout.component';
import { LoginComponent } from './Components/login/login.component';
import { RegisterComponent } from './Components/register/register.component';
import { ResetPasswordComponent } from './Components/reset-password/reset-password.component';
import { ForgetPasswordComponent } from './Components/forget-password/forget-password.component';
import { MainLayoutComponent } from './Components/Layouts/main-layout/main-layout.component';
import { ProductsComponent } from './Components/products/products.component';
import { RawMaterialProductsComponent } from './Components/raw-material-products/raw-material-products.component';
import { FavouritsComponent } from './Components/favourits/favourits.component';
import { CheckoutComponent } from './Components/checkout/checkout.component';
import { ProductDetailsComponent } from './Components/product-details/product-details.component';
import { CartComponent } from './Components/cart/cart.component';
import { AllordersComponent } from './Components/allorders/allorders.component';
import { AboutComponent } from './Components/about/about.component';
import { EmailConfirmationComponentComponent } from './Components/email-confirmation-component/email-confirmation-component.component';
import { HomeComponent } from './Components/home/home.component';
import { authGuard } from './guards/auth.guard';
import { AdvertiseCarouselComponent } from './Components/HomeSections/advertise-carousel/advertise-carousel.component';
import { MainCategoriesComponent } from './Components/HomeSections/main-categories/main-categories.component';
import { RawMaterialCategoriesComponent } from './Components/HomeSections/raw-material-categories/raw-material-categories.component';
import { RawMaterialDetailsComponent } from './Components/raw-material-details/raw-material-details.component';
import { PaymentCallbackComponent } from './Components/payment-callback/payment-callback.component';
import { PaymentPendingComponent } from './Components/payment-pending/payment-pending.component';
import { ChangePasswordComponent } from './Components/change-password/change-password.component';



const routes: Routes = [

  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      // { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'resetPassword', component: ResetPasswordComponent },
      { path: 'forgetpassword', component: ForgetPasswordComponent },
      { path: 'changepassword', component: ChangePasswordComponent },
    ]
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'advertise', component: AdvertiseCarouselComponent },
      { path: 'main-categories', component: MainCategoriesComponent },
      { path: 'rawMaterial-categories', component: RawMaterialCategoriesComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'products/:id', component: ProductsComponent },
      // { path: 'rawMaterialProducts/:categoryId', component: RawMaterialProductsComponent },
      { path: 'rawMaterialProducts', component: RawMaterialProductsComponent },
      { path: 'wishlist', component: FavouritsComponent, canActivate: [authGuard] },
      { path: 'checkout', component: CheckoutComponent, canActivate: [authGuard] },
      { path: 'rawmaterialdetails/:name', component: RawMaterialDetailsComponent },
      { path: 'productdetails/:name', component: ProductDetailsComponent },
      { path: 'cart', component: CartComponent, canActivate: [authGuard] },
      { path: 'payment/pending', component: PaymentPendingComponent, canActivate: [authGuard] },
      { path: 'allorders', component: AllordersComponent, canActivate: [authGuard] },
      { path: 'aboutus', component: AboutComponent },
      { path: 'confirm-email/:id', component: EmailConfirmationComponentComponent },           
      { path: 'reject-email/:id', component: EmailConfirmationComponentComponent },
      { path: 'payment/callback', component: PaymentCallbackComponent },

    ]
  },
  // optional fallback
  { path: '**', redirectTo: 'home' }



];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {



}
