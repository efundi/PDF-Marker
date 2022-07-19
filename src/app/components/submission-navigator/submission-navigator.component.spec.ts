import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmissionNavigatorComponent } from './submission-navigator.component';

describe('SubmissionNavigatorComponent', () => {
  let component: SubmissionNavigatorComponent;
  let fixture: ComponentFixture<SubmissionNavigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubmissionNavigatorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubmissionNavigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
