import { TestBed } from '@angular/core/testing';

import { AssignmentMarkingSessionService } from './assignment-marking-session.service';

describe('AssignmentMarkingSessionService', () => {
  let service: AssignmentMarkingSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssignmentMarkingSessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
