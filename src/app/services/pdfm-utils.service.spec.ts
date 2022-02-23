import { TestBed } from '@angular/core/testing';

import { PdfmUtilsService } from './pdfm-utils.service';

describe('PdfmUtilsService', () => {
  let service: PdfmUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfmUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
