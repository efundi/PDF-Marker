import { TestBed } from '@angular/core/testing';

import { SubmissionNavigationService } from './submission-navigation.service';

describe('SubmissionNavigationService', () => {
  let service: SubmissionNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubmissionNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
