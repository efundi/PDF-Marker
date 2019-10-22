import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IconTypeComponent } from './icon-type.component';

describe('IconTypeComponent', () => {
  let component: IconTypeComponent;
  let fixture: ComponentFixture<IconTypeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IconTypeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IconTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
