import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvertisementProductsComponent } from './advertisement-products.component';

describe('AdvertisementProductsComponent', () => {
  let component: AdvertisementProductsComponent;
  let fixture: ComponentFixture<AdvertisementProductsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdvertisementProductsComponent]
    });
    fixture = TestBed.createComponent(AdvertisementProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
