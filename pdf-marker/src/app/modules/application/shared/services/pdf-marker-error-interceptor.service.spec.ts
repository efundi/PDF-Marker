import { TestBed } from '@angular/core/testing';

import { PdfMarkerErrorInterceptorService } from './pdf-marker-error-interceptor.service';

describe('PdfMarkerErrorInterceptorService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PdfMarkerErrorInterceptorService = TestBed.get(PdfMarkerErrorInterceptorService);
    expect(service).toBeTruthy();
  });
});
