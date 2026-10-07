import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DefaultCategoriesComponent } from './default-categories.component';

describe('DefaultCategoriesComponent', () => {
  let component: DefaultCategoriesComponent;
  let fixture: ComponentFixture<DefaultCategoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DefaultCategoriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DefaultCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
