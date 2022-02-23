import { TestBed, async, inject } from '@angular/core/testing';

import { UnsavedChangesGuard } from './unsaved-changes.guard';

describe('UnsavedChangesGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UnsavedChangesGuard]
    });
  });

  it('should ...', inject([UnsavedChangesGuard], (guard: UnsavedChangesGuard) => {
    expect(guard).toBeTruthy();
  }));
});
