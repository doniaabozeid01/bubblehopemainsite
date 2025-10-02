import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileAdvertiseComponent } from './mobile-advertise.component';

describe('MobileAdvertiseComponent', () => {
  let component: MobileAdvertiseComponent;
  let fixture: ComponentFixture<MobileAdvertiseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MobileAdvertiseComponent]
    });
    fixture = TestBed.createComponent(MobileAdvertiseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
