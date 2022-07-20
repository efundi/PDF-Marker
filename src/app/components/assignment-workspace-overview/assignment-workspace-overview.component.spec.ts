import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentWorkspaceOverviewComponent } from './assignment-workspace-overview.component';

describe('AssignmentWorkspaceOverviewComponent', () => {
  let component: AssignmentWorkspaceOverviewComponent;
  let fixture: ComponentFixture<AssignmentWorkspaceOverviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AssignmentWorkspaceOverviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignmentWorkspaceOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
