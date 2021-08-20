import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfmAnnotateComponent } from './pdfm-annotate.component';

describe('PdfmAnnotateComponent', () => {
  let component: PdfmAnnotateComponent;
  let fixture: ComponentFixture<PdfmAnnotateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PdfmAnnotateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PdfmAnnotateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
