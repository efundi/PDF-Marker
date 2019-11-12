import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FinaliseMarkingComponent } from './finalise-marking.component';

describe('FinaliseMarkingComponent', () => {
  let component: FinaliseMarkingComponent;
  let fixture: ComponentFixture<FinaliseMarkingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FinaliseMarkingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FinaliseMarkingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
