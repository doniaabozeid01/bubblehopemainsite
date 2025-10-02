import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
@Injectable({
  providedIn: 'root'
})
export class SeoService {

  constructor(private titleService: Title, private metaService: Meta) { }

  updateTitleAndDescription(title: string, description: string) {
    this.titleService.setTitle(title);

    this.metaService.updateTag({ name: 'description', content: description });

    // ممكن تضيف keywords أو og tags كمان لو حبيت
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
  }}
