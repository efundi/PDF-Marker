import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentMarkingPageComponent } from './assignment-marking-page.component';

describe('AssignmentMarkingPageComponent', () => {
  let component: AssignmentMarkingPageComponent;
  let fixture: ComponentFixture<AssignmentMarkingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignmentMarkingPageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignmentMarkingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
