import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateCollection } from './update-collection';

describe('UpdateCollection', () => {
  let component: UpdateCollection;
  let fixture: ComponentFixture<UpdateCollection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateCollection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateCollection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
