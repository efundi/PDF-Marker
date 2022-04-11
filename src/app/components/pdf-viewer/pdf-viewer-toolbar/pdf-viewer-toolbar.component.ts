import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {KEY_CODE} from '../../assignment-marking/assignment-marking-toolbar/assignment-marking-toolbar.component';
import {Subscription} from 'rxjs';
import {ZoomChangeEvent} from '../../assignment-marking/assignment-marking-session.service';

export interface ToolbarSettingChange {
  zoom?: ZoomChangeEvent;
}

@Component({
  selector: 'pdf-marker-pdf-viewer-toolbar',
  templateUrl: './pdf-viewer-toolbar.component.html',
  styleUrls: ['./pdf-viewer-toolbar.component.scss']
})
export class PdfViewerToolbarComponent implements OnInit, OnChanges, OnDestroy {

  @Output()
  currentPageChange: EventEmitter<number> = new EventEmitter<number>();

  @Output()
  settingChange: EventEmitter<ToolbarSettingChange> = new EventEmitter<ToolbarSettingChange>();

  @Input()
  currentPage: number;

  @Input()
  pages: number;

  iconForm: FormGroup;

  readonly zoomOptions = [{
    label: '400%',
    value: 4.0
  }, {
    label: '200%',
    value: 2.0
  }, {
    label: '100%',
    value: 1.00
  }, {
    label: '66%',
    value: 0.66
  }, {
    label: '50%',
    value: 0.50
  }, {
    label: '33%',
    value: 0.33
  }];


  private zoomFormSubscription: Subscription;

  constructor(private fb: FormBuilder) {

  }


  ngOnDestroy() {
    this.zoomFormSubscription.unsubscribe();
    this.settingChange.complete();
  }

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.iconForm = this.fb.group({
      pageNumber: [(this.currentPage) ? this.currentPage.toString() : '1', Validators.required],
      zoom: [1.00, Validators.required],
    });

    this.zoomFormSubscription = this.iconForm.controls.zoom.valueChanges.subscribe((value) => {
      this.settingChange.emit({
        zoom: {
          previous: this.iconForm.value.zoom,
          current: value,
        }
      });
    });

  }

  onZoomSelected($event: MouseEvent) {
    $event.stopImmediatePropagation();
  }


  onPageNumberChange() {
    const number = parseInt(this.iconForm.controls.pageNumber.value, 10);
    if (!isNaN(number) && (number >= 1 && number <= this.pages)) {
      this.currentPage = number;
      this.currentPageChange.emit(this.currentPage);
    } else {
      this.iconForm.controls.pageNumber.setValue((this.currentPage) ? this.currentPage.toString() : '1');
    }
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.keyCode === KEY_CODE.RIGHT_ARROW) {
      if (this.currentPage !== this.pages) {
        this.nextPage();
      }
    }

    if (event.keyCode === KEY_CODE.LEFT_ARROW) {
      if (this.currentPage !== 1) {
        this.previousPage()
      }
    }
  }
  ngOnChanges(changes: SimpleChanges) {
    if (this.iconForm) {
      this.iconForm.controls.pageNumber.setValue(this.currentPage.toString());
    }
  }

  nextPage() {
    this.currentPage = this.currentPage + 1;
    this.currentPageChange.emit(this.currentPage);
  }

  previousPage() {
    this.currentPage = this.currentPage - 1;
    this.currentPageChange.emit(this.currentPage);
  }
}
