import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailConfirmationComponentComponent } from './email-confirmation-component.component';

describe('EmailConfirmationComponentComponent', () => {
  let component: EmailConfirmationComponentComponent;
  let fixture: ComponentFixture<EmailConfirmationComponentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmailConfirmationComponentComponent]
    });
    fixture = TestBed.createComponent(EmailConfirmationComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
