import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrls: ['./forget-password.component.scss']
})
export class ForgetPasswordComponent {


  forgotForm: FormGroup;
  message: string = '';
  errorMessage: string = '';

  constructor(private fb: FormBuilder, private api: ApiService, private seoService: SeoService,
    private loading: LoadingService) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }


  ngOnInit() {

    this.loading.hideNow();

    this.seoService.updateTitleAndDescription(
      `Forget Password | Bubble Hope`,
      `Bubble Hope - نكهة مميزة ومحبوبة في فرع حدائق الأهرام.`
    );
  }


  onSubmit() {
    if (this.forgotForm.valid) {
      const emailData = this.forgotForm.value;

      this.api.forgetPassword(emailData).subscribe({
        next: (res: any) => {
          this.message = res.message || '✅ A reset link has been sent to your email.';
          this.errorMessage = '';
        },
        error: (err) => {
          this.errorMessage = err.error || '❌ An error occurred while sending the reset link.';
          this.message = '';
        }
      });
    } else {
      // Optional: show form validation message if needed
      this.errorMessage = '❗ Please enter a valid email address.';
      this.message = '';
    }
  }






    @ViewChild('bgVideo') bgVideo!: ElementRef<HTMLVideoElement>;
  
    ngAfterViewInit() {
      if (this.bgVideo) {
        const video = this.bgVideo.nativeElement;
        video.muted = true;
        video.volume = 0;
        video.play().catch(() => { });
      }
    }
  

}
