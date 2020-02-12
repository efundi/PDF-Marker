import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RubricViewMarkingComponent } from './rubric-view-marking.component';

describe('RubricViewMarkingComponent', () => {
  let component: RubricViewMarkingComponent;
  let fixture: ComponentFixture<RubricViewMarkingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RubricViewMarkingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RubricViewMarkingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
