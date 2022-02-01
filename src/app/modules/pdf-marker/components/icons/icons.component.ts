import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output} from '@angular/core';
import {IconTypeEnum} from '@pdfMarkerModule/info-objects/icon-type.enum';
import {IconInfo} from '@pdfMarkerModule/info-objects/icon.info';
import {
  AssignmentMarkingSessionService
} from '@pdfMarkerModule/components/assignment-marking/assignment-marking-session.service';

export enum KEY_CODE {
  RIGHT_ARROW = 39,
  LEFT_ARROW = 37
}

@Component({
  selector: 'pdf-marker-icons',
  templateUrl: './icons.component.html',
  styleUrls: ['./icons.component.scss']
})
export class IconsComponent implements OnInit, OnChanges {


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

  readonly markIcons: IconInfo[] = [
    { icon: 'check', type: IconTypeEnum.FULL_MARK, toolTip: 'Single Mark' },
    { icon: 'halfTick', type: IconTypeEnum.HALF_MARK, toolTip: 'Half Mark' },
    { icon: 'spellcheck', type: IconTypeEnum.ACK_MARK, toolTip: 'Acknowledge Tick' },
    { icon: 'close', type: IconTypeEnum.CROSS, toolTip: 'Cross Mark'},
    { icon: 'comment', type: IconTypeEnum.NUMBER, toolTip: 'Comment and Mark'},

  ];
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
  ngOnInit() {
    this.initForm();
    this.selectedColour = this.assignmentMarkingSessionService.colour;
  }

  private initForm() {
    this.iconForm = this.fb.group({
      pageNumber: [(this.currentPage) ? this.currentPage.toString() : '1', Validators.required]
    });
  }

  onIconClick(event, selectedIcon: IconInfo) {
    event.stopPropagation();
    if (this.selecetedIcon === selectedIcon) {
      this.assignmentMarkingSessionService.icon = undefined;
      this.selecetedIcon = undefined;

    } else {
      // emit selectedIcon to marking component
      this.assignmentMarkingSessionService.icon = selectedIcon;
      this.selecetedIcon = selectedIcon;
    }
  }

  onControl(event: MouseEvent, controlName: string) {
    event.stopPropagation();
    this.control.emit(controlName);
  }

  onPageNumberChange(event) {
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

  ngOnChanges() {
    if (this.iconForm) {
      this.iconForm.controls.pageNumber.setValue(this.currentPage.toString());
    }
  }
}
