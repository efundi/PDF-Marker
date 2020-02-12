import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {RubricViewModalComponent} from "@sharedModule/components/rubric-view-modal/rubric-view-modal.component";




describe('RubricViewModalComponent', () => {
  let component: RubricViewModalComponent;
  let fixture: ComponentFixture<RubricViewModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RubricViewModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RubricViewModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
