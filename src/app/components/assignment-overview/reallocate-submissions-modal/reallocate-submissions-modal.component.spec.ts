import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReallocateSubmissionsModalComponent } from './reallocate-submissions-modal.component';

describe('ReallocateSubmissionsModalComponent', () => {
  let component: ReallocateSubmissionsModalComponent;
  let fixture: ComponentFixture<ReallocateSubmissionsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReallocateSubmissionsModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReallocateSubmissionsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
