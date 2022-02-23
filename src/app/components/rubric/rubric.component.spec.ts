import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RubricComponent } from './rubric.component';

describe('RubricComponent', () => {
  let component: RubricComponent;
  let fixture: ComponentFixture<RubricComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RubricComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RubricComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
