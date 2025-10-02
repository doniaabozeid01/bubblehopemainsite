import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingSiteComponent } from './pending-site.component';

describe('PendingSiteComponent', () => {
  let component: PendingSiteComponent;
  let fixture: ComponentFixture<PendingSiteComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PendingSiteComponent]
    });
    fixture = TestBed.createComponent(PendingSiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
