import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-preloader',
  templateUrl: './preloader.component.html',
  styleUrls: ['./preloader.component.scss']
})
export class PreloaderComponent {
 @Input() show = true;

  // عشان نعمل fade-out نحتاج نعرضه مرة واحدة وبعدين نُخفيه بهدوء
  showOnce = true;
  fadeOut = false;

  ngOnChanges() {
    if (!this.show && this.showOnce) {
      // ابدأ أنيميشن الإخفاء
      this.fadeOut = true;
      setTimeout(() => { this.showOnce = false; }, 350); // نفس زمن الـ transition في CSS
    }
  }
}
