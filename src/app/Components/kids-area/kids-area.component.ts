import { Component, HostListener } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-kids-area',
  templateUrl: './kids-area.component.html',
  styleUrls: ['./kids-area.component.scss']
})
export class KidsAreaComponent {
  showScrollButton = false;

  ages = Array.from({ length: 10 }, (_, i) => i + 3); // 3..12

  registration = {
    parentName: '',
    phone: '',
    childName: '',
    childAge: '',
    birthDate: ''
  };

  constructor(
    private seoService: SeoService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.seoService.updateTitleAndDescription(
      `Bubble Hope Kids Area | حيث يلعب الأطفال ويرتاح الأهل`,
      `سجّل طفلك في Bubble Hope Kids Area - مساحة آمنة وممتعة للأطفال من 2 إلى 12 سنة، مع مشروبات البابل تي للأهل.`
    );
  }

  submitRegistration() {
    if (
      !this.registration.parentName ||
      !this.registration.phone ||
      !this.registration.childName ||
      !this.registration.childAge ||
      !this.registration.birthDate
    ) {
      this.toastr.error('Please fill in all the required fields.');
      return;
    }

    this.toastr.success(`Thanks ${this.registration.parentName}! We'll confirm via SMS within 1 hour.`);

    this.registration = {
      parentName: '',
      phone: '',
      childName: '',
      childAge: '',
      birthDate: ''
    };
  }

  scrollToForm() {
    document.getElementById('kids-register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.showScrollButton = scrollPosition > 300;
  }
}
