import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkTypeIconComponent } from './mark-type-icon.component';

describe('MarkTypeIconComponent', () => {
  let component: MarkTypeIconComponent;
  let fixture: ComponentFixture<MarkTypeIconComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MarkTypeIconComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkTypeIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
