import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentMarkingComponent } from './assignment-marking.component';

describe('AssignmentMarkingComponent', () => {
  let component: AssignmentMarkingComponent;
  let fixture: ComponentFixture<AssignmentMarkingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AssignmentMarkingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignmentMarkingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
