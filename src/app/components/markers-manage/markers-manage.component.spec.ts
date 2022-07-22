import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkersManageComponent } from './markers-manage.component';

describe('MarkersManageComponent', () => {
  let component: MarkersManageComponent;
  let fixture: ComponentFixture<MarkersManageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MarkersManageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkersManageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
