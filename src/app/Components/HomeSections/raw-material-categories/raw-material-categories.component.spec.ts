import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RawMaterialCategoriesComponent } from './raw-material-categories.component';

describe('RawMaterialCategoriesComponent', () => {
  let component: RawMaterialCategoriesComponent;
  let fixture: ComponentFixture<RawMaterialCategoriesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RawMaterialCategoriesComponent]
    });
    fixture = TestBed.createComponent(RawMaterialCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
