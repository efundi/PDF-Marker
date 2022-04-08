import {FormBuilder, FormGroup, Validators} from '@angular/forms';
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
import {IconTypeEnum} from '@shared/info-objects/icon-type.enum';
import {IconInfo} from '../../../info-objects/icon.info';
import {
  AssignmentMarkingSessionService
} from '../assignment-marking-session.service';
import {Subscription} from 'rxjs';
import {HIGHLIGHTER_OPTIONS, HighlighterColor} from '../../../info-objects/highlighter-color';

export enum KEY_CODE {
  RIGHT_ARROW = 39,
  LEFT_ARROW = 37
}

@Component({
  selector: 'pdf-marker-assignment-marking-toolbar',
  templateUrl: './assignment-marking-toolbar.component.html',
  styleUrls: ['./assignment-marking-toolbar.component.scss']
})
export class AssignmentMarkingToolbarComponent implements OnInit, OnChanges, OnDestroy {


  @Output()
  control: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  currentPageChange: EventEmitter<number> = new EventEmitter<number>();

  @Output()
  paneDisplayOption: EventEmitter<string> = new EventEmitter<string>();

  @Input()
  currentPage: number;

  @Input()
  pages: number;

  @Input()
  containsRubric: boolean;

  selecetedIcon: IconInfo;


  selectedColour: string;

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

  readonly markIcons: IconInfo[] = [
    { icon: 'check', type: IconTypeEnum.FULL_MARK, toolTip: 'Single Mark' },
    { icon: 'halfTick', type: IconTypeEnum.HALF_MARK, toolTip: 'Half Mark' },
    { icon: 'spellcheck', type: IconTypeEnum.ACK_MARK, toolTip: 'Acknowledge Tick' },
    { icon: 'close', type: IconTypeEnum.CROSS, toolTip: 'Cross Mark'},
    { icon: 'comment', type: IconTypeEnum.NUMBER, toolTip: 'Comment and Mark'},
    { icon: 'brush', type: IconTypeEnum.HIGHLIGHT, toolTip: 'Highlight'},
  ];

  private zoomFormSubscription: Subscription;
  private highlightSubscription: Subscription;

  /**
   * Current active highlighter colour
   */
  selectedHighlightColour: string;

  /**
   * Available options for highlighter color
   */
  highlightOptions = HIGHLIGHTER_OPTIONS;

  /**
   * Current colour for the highlighter tool.
   * This colour differs depending on if rubric is enabled, highlighter active, and selecte highlighter colour
   */
  highlightToolColor: string;

  constructor(private fb: FormBuilder,
              private assignmentMarkingSessionService: AssignmentMarkingSessionService) {}
  /** constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer, private fb: FormBuilder) {
    this.matIconRegistry
      .addSvgIcon("halfTick", this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/halftick.svg"))
      .addSvgIcon("layout-expand-left", this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/layout-expand-left.svg"))
      .addSvgIcon("layout-expand-right", this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/layout-expand-right.svg"))
      .addSvgIcon("layout-default", this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/layout-default.svg"));
  }
   */

  ngOnDestroy() {
    this.highlightSubscription.unsubscribe();
    this.zoomFormSubscription.unsubscribe();
  }

  ngOnInit() {
    this.initForm();
    this.selectedColour = this.assignmentMarkingSessionService.colour;
    this.selectedHighlightColour = this.assignmentMarkingSessionService.highlighterColour.preview;
  }

  private initForm() {
    this.iconForm = this.fb.group({
      pageNumber: [(this.currentPage) ? this.currentPage.toString() : '1', Validators.required],
      zoom: [1.00, Validators.required],
    });

    this.zoomFormSubscription = this.iconForm.controls.zoom.valueChanges.subscribe((value) => {

      this.assignmentMarkingSessionService.zoom = value;

    });

    this.highlightSubscription = this.assignmentMarkingSessionService.highlighterColourChanged.subscribe((value) => {
      this.selectedHighlightColour = value.preview;
    });
  }

  onZoomSelected($event: MouseEvent) {
    $event.stopImmediatePropagation();
  }

  onIconClick(selectedIcon: IconInfo, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    if (this.selecetedIcon === selectedIcon) {
      this.assignmentMarkingSessionService.icon = undefined;
      this.selecetedIcon = undefined;
      this.highlightToolColor = null;
    } else {
      // emit selectedIcon to marking component
      this.assignmentMarkingSessionService.icon = selectedIcon;
      this.selecetedIcon = selectedIcon;

      if (this.selecetedIcon.type === IconTypeEnum.HIGHLIGHT) {
        this.highlightToolColor = this.selectedHighlightColour;
      } else {
        this.highlightToolColor = null;
      }
    }
  }

  onControl(event: MouseEvent, controlName: string) {
    event.stopPropagation();
    this.control.emit(controlName);
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
        this.control.emit('nextPage');
      }
    }

    if (event.keyCode === KEY_CODE.LEFT_ARROW) {
      if (this.currentPage !== 1) {
        this.control.emit('prevPage');
      }
    }
  }

  onColourChange(colour: string) {
    this.assignmentMarkingSessionService.colour = colour;
  }

  onPaneNavigationClick(option: string) {
    this.paneDisplayOption.emit(option);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.iconForm) {
      this.iconForm.controls.pageNumber.setValue(this.currentPage.toString());
    }
    if (changes.hasOwnProperty('containsRubric')) {
      if (changes.containsRubric.currentValue) {
        this.highlightToolColor = 'rgba(0,0,0,.26)';
      }
    }
  }

  selectHighlighter(highlightOption: HighlighterColor) {
    this.highlightToolColor = highlightOption.colour;
    this.assignmentMarkingSessionService.highlighterColour = highlightOption;
    this.assignmentMarkingSessionService.icon = this.markIcons[5];
    this.selecetedIcon = this.markIcons[5];
  }
}
