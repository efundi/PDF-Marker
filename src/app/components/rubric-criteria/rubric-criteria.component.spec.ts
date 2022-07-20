import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RubricCriteriaComponent } from './rubric-criteria.component';

describe('RubricCriteriaComponent', () => {
  let component: RubricCriteriaComponent;
  let fixture: ComponentFixture<RubricCriteriaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RubricCriteriaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RubricCriteriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
