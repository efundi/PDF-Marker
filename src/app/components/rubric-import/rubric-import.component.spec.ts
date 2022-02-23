import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RubricImportComponent } from './rubric-import.component';

describe('RubricImportComponent', () => {
  let component: RubricImportComponent;
  let fixture: ComponentFixture<RubricImportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RubricImportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RubricImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
