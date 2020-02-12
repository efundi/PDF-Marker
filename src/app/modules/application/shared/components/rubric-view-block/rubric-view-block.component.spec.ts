import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RubricViewBlockComponent } from './rubric-view-block.component';

describe('RubricViewBlockComponent', () => {
  let component: RubricViewBlockComponent;
  let fixture: ComponentFixture<RubricViewBlockComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RubricViewBlockComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RubricViewBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
