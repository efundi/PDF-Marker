import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkTypeHighlightComponent } from './mark-type-highlight.component';

describe('MarkTypeHighlightComponent', () => {
  let component: MarkTypeHighlightComponent;
  let fixture: ComponentFixture<MarkTypeHighlightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MarkTypeHighlightComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkTypeHighlightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
