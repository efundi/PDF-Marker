import { TestBed, async, inject } from '@angular/core/testing';

import { MarkingGuard } from './marking.guard';

describe('MarkingGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MarkingGuard]
    });
  });

  it('should ...', inject([MarkingGuard], (guard: MarkingGuard) => {
    expect(guard).toBeTruthy();
  }));
});
