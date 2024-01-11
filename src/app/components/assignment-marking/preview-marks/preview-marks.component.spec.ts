import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PreviewMarksComponent } from './preview-marks.component';

describe('PreviewMarksComponent', () => {
  let component: PreviewMarksComponent;
  let fixture: ComponentFixture<PreviewMarksComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PreviewMarksComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PreviewMarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
