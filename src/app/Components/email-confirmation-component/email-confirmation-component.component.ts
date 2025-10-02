import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-email-confirmation-component',
  templateUrl: './email-confirmation-component.component.html',
  styleUrls: ['./email-confirmation-component.component.scss']
})
export class EmailConfirmationComponentComponent {
  message = 'Processing...';
  success = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    // حاول نحدد نوع الصفحة من الراوت نفسه، ولو مش متاح، من الـ URL
    console.log(id);

    const routePath = this.route.snapshot.routeConfig?.path ?? '';
    const isConfirm = routePath.startsWith('confirm-email') || this.router.url.includes('confirm-email');
    const isReject = routePath.startsWith('reject-email') || this.router.url.includes('reject-email');

    console.log(routePath);
    console.log(isConfirm);
    console.log(isReject);


    if (!id) {
      console.log("hi");

      this.success = false;
      this.message = 'Invalid confirmation link.';
      return;
    }

    if (isConfirm) {
      console.log("hi2");

      this.api.confirmEmail(id).subscribe({
        next: (res) => {
          console.log("hi3");

          this.success = true;
          this.message = res.message_ar || res.message || 'تم تأكيد البريد الإلكتروني بنجاح.';
        },
        error: (err) => {
          console.log("hi4");

          this.success = false;
          this.message = err?.error.message_ar || err?.error.message || 'حدث خطأ.';
        },
      });

    } else if (isReject) {
      
      console.log("hi5");
      this.api.rejectEmail(id).subscribe({
        next: (res) => {
          console.log("hi6");
          console.log(res);
          this.success = true;
          this.message = res.message_ar || res.message || 'تم تنفيذ اختيارك بنجاح.';
        },
        error: (err) => {
          console.log("hi7");
          console.log(err);
          this.success = false;
          this.message = err?.error.message_ar || err?.error.message || 'حدث خطأ.';
        },
      });
    } else {
      console.log("hi8");

      this.success = false;
      this.message = 'Invalid route.';
    }
  }
}
