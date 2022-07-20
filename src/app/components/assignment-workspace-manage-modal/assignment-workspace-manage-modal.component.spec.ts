import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentWorkspaceManageModalComponent } from './assignment-workspace-manage-modal.component';

describe('AssignmentWorkspaceManageModalComponent', () => {
  let component: AssignmentWorkspaceManageModalComponent;
  let fixture: ComponentFixture<AssignmentWorkspaceManageModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AssignmentWorkspaceManageModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignmentWorkspaceManageModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
