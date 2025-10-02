import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RawMaterialProductsComponent } from './raw-material-products.component';

describe('RawMaterialProductsComponent', () => {
  let component: RawMaterialProductsComponent;
  let fixture: ComponentFixture<RawMaterialProductsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RawMaterialProductsComponent]
    });
    fixture = TestBed.createComponent(RawMaterialProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
