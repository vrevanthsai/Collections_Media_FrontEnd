import { TestBed } from '@angular/core/testing';

import { FriendConnectionService } from './friend-connection-service';

describe('FriendConnectionService', () => {
  let service: FriendConnectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FriendConnectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
