import { TestBed } from '@angular/core/testing';

import { ZipService } from './zip.service';

describe('ZipService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ZipService = TestBed.get(ZipService);
    expect(service).toBeTruthy();
  });
});
