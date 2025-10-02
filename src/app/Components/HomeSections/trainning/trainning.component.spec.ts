import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainningComponent } from './trainning.component';

describe('TrainningComponent', () => {
  let component: TrainningComponent;
  let fixture: ComponentFixture<TrainningComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TrainningComponent]
    });
    fixture = TestBed.createComponent(TrainningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
