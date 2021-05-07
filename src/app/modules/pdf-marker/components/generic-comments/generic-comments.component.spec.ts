import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericCommentsComponent } from './generic-comments.component';

describe('GenericCommentsComponent', () => {
  let component: GenericCommentsComponent;
  let fixture: ComponentFixture<GenericCommentsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GenericCommentsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GenericCommentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
