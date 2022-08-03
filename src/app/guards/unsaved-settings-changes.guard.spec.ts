import { TestBed } from '@angular/core/testing';

import { UnsavedSettingsChangesGuard } from './unsaved-settings-changes.guard';

describe('UnsavedSettingsChangesGuard', () => {
  let guard: UnsavedSettingsChangesGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(UnsavedSettingsChangesGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
