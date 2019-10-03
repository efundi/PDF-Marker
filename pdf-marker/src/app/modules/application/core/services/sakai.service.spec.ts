import { TestBed } from '@angular/core/testing';

import { SakaiService } from './sakai.service';

describe('SakaiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SakaiService = TestBed.get(SakaiService);
    expect(service).toBeTruthy();
  });
});
