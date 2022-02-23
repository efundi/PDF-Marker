import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkingCommentModalComponent } from './marking-comment-modal.component';

describe('MarkingCommentModalComponent', () => {
  let component: MarkingCommentModalComponent;
  let fixture: ComponentFixture<MarkingCommentModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MarkingCommentModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkingCommentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
