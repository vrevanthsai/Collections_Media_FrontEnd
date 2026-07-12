import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FriendsList } from './friends-list';

describe('FriendsList', () => {
  let component: FriendsList;
  let fixture: ComponentFixture<FriendsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FriendsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FriendsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
