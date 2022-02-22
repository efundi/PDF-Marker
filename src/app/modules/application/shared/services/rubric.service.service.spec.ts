import { TestBed } from '@angular/core/testing';

import { Rubric.ServiceService } from './rubric.service.service';

describe('Rubric.ServiceService', () => {
  let service: Rubric.ServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Rubric.ServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
