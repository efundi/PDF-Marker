import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportMarkerModalComponent } from './import-marker-modal.component';

describe('ImportMarkerModalComponent', () => {
  let component: ImportMarkerModalComponent;
  let fixture: ComponentFixture<ImportMarkerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportMarkerModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportMarkerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
