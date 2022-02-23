import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RubricCriteriaLevelBlockComponent } from './rubric-criteria-level-block.component';

describe('RubricCriteriaLevelBlockComponent', () => {
  let component: RubricCriteriaLevelBlockComponent;
  let fixture: ComponentFixture<RubricCriteriaLevelBlockComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RubricCriteriaLevelBlockComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RubricCriteriaLevelBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
