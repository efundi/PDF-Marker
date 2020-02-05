import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentMarkingRubricComponent } from './assignment-marking-rubric.component';

describe('AssignmentMarkingRubricComponent', () => {
  let component: AssignmentMarkingRubricComponent;
  let fixture: ComponentFixture<AssignmentMarkingRubricComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AssignmentMarkingRubricComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignmentMarkingRubricComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
