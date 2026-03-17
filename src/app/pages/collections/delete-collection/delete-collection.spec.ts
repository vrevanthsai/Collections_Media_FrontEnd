import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteCollection } from './delete-collection';

describe('DeleteCollection', () => {
  let component: DeleteCollection;
  let fixture: ComponentFixture<DeleteCollection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteCollection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteCollection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
