import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllocateMarkersModalComponent } from './allocate-markers-modal.component';

describe('AllocateMarkersModalComponent', () => {
  let component: AllocateMarkersModalComponent;
  let fixture: ComponentFixture<AllocateMarkersModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AllocateMarkersModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AllocateMarkersModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
