import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { AboutComponent } from './Components/about/about.component';
import { AllordersComponent } from './Components/allorders/allorders.component';
import { CartComponent } from './Components/cart/cart.component';
import { CheckoutComponent } from './Components/checkout/checkout.component';
import { EmailConfirmationComponentComponent } from './Components/email-confirmation-component/email-confirmation-component.component';
import { FavouritsComponent } from './Components/favourits/favourits.component';
import { FooterComponent } from './Components/footer/footer.component';
import { ForgetPasswordComponent } from './Components/forget-password/forget-password.component';
import { LoginComponent } from './Components/login/login.component';
import { NavbarComponent } from './Components/navbar/navbar.component';
import { ProductDetailsComponent } from './Components/product-details/product-details.component';
import { ProductsComponent } from './Components/products/products.component';
import { RawMaterialProductsComponent } from './Components/raw-material-products/raw-material-products.component';
import { RegisterComponent } from './Components/register/register.component';
import { ResetPasswordComponent } from './Components/reset-password/reset-password.component';
import { AuthLayoutComponent } from './Components/Layouts/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './Components/Layouts/main-layout/main-layout.component';
import { HomeComponent } from './Components/home/home.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthInterceptor } from './Interceptors/auth.interceptor';
import { AdvertiseCarouselComponent } from './Components/HomeSections/advertise-carousel/advertise-carousel.component';
import { CarouselModule } from 'ngx-owl-carousel-o';
import { MainCategoriesComponent } from './Components/HomeSections/main-categories/main-categories.component';
import { RawMaterialCategoriesComponent } from './Components/HomeSections/raw-material-categories/raw-material-categories.component';
import { MobileAdvertiseComponent } from './Components/HomeSections/mobile-advertise/mobile-advertise.component';
import { BestSellersComponent } from './Components/HomeSections/best-sellers/best-sellers.component';
import { ContactComponent } from './Components/HomeSections/contact/contact.component';
import { RawMaterialDetailsComponent } from './Components/raw-material-details/raw-material-details.component';
import { PreloaderComponent } from './Components/preloader/preloader.component';
import { LoadingInterceptor } from './Interceptors/loading.interceptor';
import { PaymentCallbackComponent } from './Components/payment-callback/payment-callback.component';
import { PaymentPendingComponent } from './Components/payment-pending/payment-pending.component';
import { AuthService } from './services/auth.service';
import { PendingSiteComponent } from './Components/pending-site/pending-site.component';
import { ChangePasswordComponent } from './Components/change-password/change-password.component';
import { TrainningComponent } from './Components/HomeSections/trainning/trainning.component';
import { ImageCarouselComponent } from './Components/HomeSections/image-carousel/image-carousel.component';
import { TestLoginComponent } from './Components/test-login/test-login.component';
import { ProfileComponent } from './Components/profile/profile.component';
import { AdvertisementProductsComponent } from './Components/advertisement-products/advertisement-products.component';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '../assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    AboutComponent,
    AllordersComponent,
    CartComponent,
    CheckoutComponent,
    EmailConfirmationComponentComponent,
    FavouritsComponent,
    FooterComponent,
    ForgetPasswordComponent,
    LoginComponent,
    NavbarComponent,
    ProductDetailsComponent,
    ProductsComponent,
    RawMaterialProductsComponent,
    RegisterComponent,
    ResetPasswordComponent,
    AuthLayoutComponent,
    MainLayoutComponent,
    HomeComponent,
    AdvertiseCarouselComponent,
    MainCategoriesComponent,
    RawMaterialCategoriesComponent,
    MobileAdvertiseComponent,
    BestSellersComponent,
    ContactComponent,
    RawMaterialDetailsComponent,
    PreloaderComponent,
    PaymentCallbackComponent,
    PaymentPendingComponent,
    PendingSiteComponent,
    ChangePasswordComponent,
    TrainningComponent,
    ImageCarouselComponent,
    TestLoginComponent,
    ProfileComponent,
    AdvertisementProductsComponent
    ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,   // ✅ مهم
    FormsModule,
    CarouselModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      positionClass: 'toast-top-right',
      timeOut: 3000,
      preventDuplicates: true,
    }),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }, // ✅,
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true }

  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  constructor(private authService: AuthService) { }

  ngOnInit() {
    this.authService.loadUserFromStorage();
  }

}
