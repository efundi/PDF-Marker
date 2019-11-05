import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { YesAndNoConfirmationDialogComponent } from './yes-and-no-confirmation-dialog.component';

describe('YesAndNoConfirmationDialogComponent', () => {
  let component: YesAndNoConfirmationDialogComponent;
  let fixture: ComponentFixture<YesAndNoConfirmationDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ YesAndNoConfirmationDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(YesAndNoConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
