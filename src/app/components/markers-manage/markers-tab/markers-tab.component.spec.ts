import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkersTabComponent } from './markers-tab.component';

describe('MarkersTabComponent', () => {
  let component: MarkersTabComponent;
  let fixture: ComponentFixture<MarkersTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MarkersTabComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkersTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
