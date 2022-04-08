import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkingHighlightModalComponent } from './marking-highlight-modal.component';

describe('MarkingHighlightModalComponent', () => {
  let component: MarkingHighlightModalComponent;
  let fixture: ComponentFixture<MarkingHighlightModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MarkingHighlightModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkingHighlightModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
