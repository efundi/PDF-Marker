import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentMarkingToolbarComponent } from './assignment-marking-toolbar.component';

describe('IconsComponent', () => {
  let component: AssignmentMarkingToolbarComponent;
  let fixture: ComponentFixture<AssignmentMarkingToolbarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AssignmentMarkingToolbarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignmentMarkingToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
