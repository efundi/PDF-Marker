import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RubricViewComponent } from './rubric-view.component';

describe('RubricViewComponent', () => {
  let component: RubricViewComponent;
  let fixture: ComponentFixture<RubricViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RubricViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RubricViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
