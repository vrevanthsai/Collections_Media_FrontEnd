import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockedUsersList } from './blocked-users-list';

describe('BlockedUsersList', () => {
  let component: BlockedUsersList;
  let fixture: ComponentFixture<BlockedUsersList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockedUsersList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlockedUsersList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
