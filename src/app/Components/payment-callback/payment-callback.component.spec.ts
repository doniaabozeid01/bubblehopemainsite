import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentCallbackComponent } from './payment-callback.component';

describe('PaymentCallbackComponent', () => {
  let component: PaymentCallbackComponent;
  let fixture: ComponentFixture<PaymentCallbackComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PaymentCallbackComponent]
    });
    fixture = TestBed.createComponent(PaymentCallbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
