import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FileExplorerModalComponent } from './file-explorer-modal.component';

describe('FileExplorerModalComponent', () => {
  let component: FileExplorerModalComponent;
  let fixture: ComponentFixture<FileExplorerModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FileExplorerModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FileExplorerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
