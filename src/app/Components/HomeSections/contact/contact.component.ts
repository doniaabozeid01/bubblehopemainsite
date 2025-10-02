import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { BranchService } from 'src/app/services/branch.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  contactForm!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService,
    public languageService: LanguageService,
    private branchService: BranchService,

  ) { }

  ngOnInit() {
    this.initContactForm();

  }

  initContactForm() {
    this.contactForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.maxLength(1000)]]
    });
  }

  submit() {
    if (this.contactForm.invalid) {
      console.log(this.contactForm);
      return;
    }

    this.isLoading = true;

    this.api.contactUs(this.contactForm.value).subscribe({
      next: () => {
        this.toastr.success("mail sent successfully");
        this.contactForm.reset();
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.toastr.error("something went wrong");
        this.isLoading = false;
      }
    });
  }




}
