import { NgIf } from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Toast, ToastPackage, ToastrService } from 'ngx-toastr';

/**
 * Many toasts across the app are written in English. On the Arabic site they are shown in
 * Arabic through this table (matched ignoring case and trailing punctuation); anything not
 * listed — e.g. messages that come from the server — is shown as it is.
 */
const AR_MESSAGES: Record<string, string> = {
  "great choice! it's now in your cart": 'اختيار موفّق! اتضاف للسلة',
  'product removed from your cart': 'اتشال المنتج من السلة',
  'product removed from your wishlist': 'اتشال المنتج من المفضلة',
  'product saved to your wishlist': 'اتضاف المنتج للمفضلة',
  'link copied to clipboard': 'اتنسخ الرابط',
  'this product is out of stock': 'المنتج ده خلصان حاليًا',
  'failed to add to cart': 'مقدرناش نضيف المنتج للسلة',
  'failed to remove item': 'مقدرناش نشيل المنتج، حاول تاني',
  "couldn't remove this product. please try again": 'مقدرناش نشيل المنتج، حاول تاني',
  'something went wrong': 'حصلت مشكلة، حاول تاني',
  'branch switched successfully': 'اتغيّر الفرع بنجاح',
  'failed to switch branch on server': 'مقدرناش نغيّر الفرع، حاول تاني',
  'failed to identify user for branch switch': 'مقدرناش نتعرف على حسابك لتغيير الفرع',
  'please try to pay again': 'من فضلك حاول تدفع تاني',
  'mail sent successfully': 'اتبعتت رسالتك بنجاح',
};

function toArabic(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  const key = text.trim().replace(/[.!\s]+$/g, '').toLowerCase();
  return AR_MESSAGES[key] ?? text;
}

@Component({
  selector: '[toast-component]',
  standalone: true,
  imports: [NgIf],
  preserveWhitespaces: false,
  template: `
    <button *ngIf="options.closeButton" (click)="remove()" type="button" class="toast-close-button" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
    <div *ngIf="title" [class]="options.titleClass" [attr.aria-label]="title">
      {{ title }} <ng-container *ngIf="duplicatesCount">[{{ duplicatesCount + 1 }}]</ng-container>
    </div>
    <div *ngIf="message && options.enableHtml" role="alert" [class]="options.messageClass" [innerHTML]="message"></div>
    <div *ngIf="message && !options.enableHtml" role="alert" [class]="options.messageClass" [attr.aria-label]="message">
      {{ message }}
    </div>
    <div *ngIf="options.progressBar">
      <div class="toast-progress" [style.width]="width + '%'"></div>
    </div>
  `,
  animations: [
    trigger('flyInOut', [
      state('inactive', style({ opacity: 0, transform: 'translateY(-26px) scale(0.85)' })),
      state('active', style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      state('removed', style({ opacity: 0, transform: 'translateY(-14px) scale(0.92)' })),
      transition('inactive => active', animate('460ms cubic-bezier(0.16, 1.3, 0.3, 1)')),
      transition('active => removed', animate('240ms ease-in')),
    ]),
  ],
})
export class AppToastComponent extends Toast {
  constructor(
    toastrService: ToastrService,
    toastPackage: ToastPackage,
    ngZone: NgZone,
    translate: TranslateService
  ) {
    if (translate.currentLang === 'ar') {
      toastPackage.message = toArabic(toastPackage.message) ?? toastPackage.message;
      toastPackage.title = toArabic(toastPackage.title) ?? toastPackage.title;
    }
    super(toastrService, toastPackage, ngZone);
  }
}
