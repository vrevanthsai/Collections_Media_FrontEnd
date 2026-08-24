import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareTabContentComponent } from './share-tab-content.component';

describe('ShareTabContentComponent', () => {
  let component: ShareTabContentComponent;
  let fixture: ComponentFixture<ShareTabContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareTabContentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShareTabContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
