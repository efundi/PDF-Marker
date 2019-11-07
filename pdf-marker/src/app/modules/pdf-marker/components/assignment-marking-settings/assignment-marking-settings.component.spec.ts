import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentMarkingSettingsComponent } from './assignment-marking-settings.component';

describe('AssignmentMarkingSettingsComponent', () => {
  let component: AssignmentMarkingSettingsComponent;
  let fixture: ComponentFixture<AssignmentMarkingSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AssignmentMarkingSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignmentMarkingSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
