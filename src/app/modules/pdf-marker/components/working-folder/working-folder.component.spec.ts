import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkingFolderComponent } from './working-folder.component';

describe('WorkingFolderComponent', () => {
  let component: WorkingFolderComponent;
  let fixture: ComponentFixture<WorkingFolderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WorkingFolderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkingFolderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
