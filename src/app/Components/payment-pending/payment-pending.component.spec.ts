import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentPendingComponent } from './payment-pending.component';

describe('PaymentPendingComponent', () => {
  let component: PaymentPendingComponent;
  let fixture: ComponentFixture<PaymentPendingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PaymentPendingComponent]
    });
    fixture = TestBed.createComponent(PaymentPendingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
