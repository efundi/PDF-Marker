import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentOverviewComponent } from './assignment-overview.component';

describe('AssignmentOverviewComponent', () => {
  let component: AssignmentOverviewComponent;
  let fixture: ComponentFixture<AssignmentOverviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AssignmentOverviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignmentOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
