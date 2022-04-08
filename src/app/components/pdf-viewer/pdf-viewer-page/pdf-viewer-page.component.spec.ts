import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfViewerPageComponent } from './pdf-viewer-page.component';

describe('PdfViewerPageComponent', () => {
  let component: PdfViewerPageComponent;
  let fixture: ComponentFixture<PdfViewerPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PdfViewerPageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PdfViewerPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
