import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output} from '@angular/core';
import {IconTypeEnum} from "@pdfMarkerModule/info-objects/icon-type.enum";
import {IconInfo} from "@pdfMarkerModule/info-objects/icon.info";
import {MatIconRegistry} from "@angular/material/icon";
import {DomSanitizer} from "@angular/platform-browser";

export enum KEY_CODE {
  RIGHT_ARROW = 39,
  LEFT_ARROW = 37
};

@Component({
  selector: 'pdf-marker-icons',
  templateUrl: './icons.component.html',
  styleUrls: ['./icons.component.scss']
})
export class IconsComponent implements OnInit, OnChanges {

  @Output()
  selection: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  control: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  pageNumber: EventEmitter<number> = new EventEmitter<number>();

  @Output()
  colour: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  colourPickerClose: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  paneDisplayOption: EventEmitter<string> = new EventEmitter<string>();

  @Input()
  currentPage: number;

  @Input()
  pages: number;

  @Input()
  containsRubric: boolean;

  selecetedIcon: IconInfo;

  private readonly defaultColour = "#6F327A";

  @Input()
  selectedColour: string = this.defaultColour;

  iconForm: FormGroup;

  readonly markIcons: IconInfo[] = [
    { icon: 'check', type: IconTypeEnum.FULL_MARK, toolTip: 'Single Mark' },
    { icon: 'halfTick', type: IconTypeEnum.HALF_MARK, toolTip: 'Half Mark' },
    { icon: 'spellcheck', type: IconTypeEnum.ACK_MARK, toolTip: 'Acknowledge Tick' },
    { icon: 'close', type: IconTypeEnum.CROSS, toolTip: 'Cross Mark'},
    { icon: 'comment', type: IconTypeEnum.NUMBER, toolTip: 'Comment and Mark'},

  ];
  constructor(private fb: FormBuilder) {}
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
  }

  private initForm() {
    this.iconForm = this.fb.group({
      pageNumber: [(this.currentPage) ? this.currentPage.toString():"1", Validators.required]
    });
  }

  onIconClick(event, selectedIcon: IconInfo) {
    event.stopPropagation();
    if(JSON.stringify(this.selecetedIcon) === JSON.stringify(selectedIcon)) {
      this.selecetedIcon = undefined;
      this.selection.emit(undefined);
    }
    else {
      // emit selectedIcon to marking component
      this.selecetedIcon = selectedIcon;
      this.selection.emit(JSON.stringify(selectedIcon));
    }
  }

  async onControl(event, controlName: string) {
    event.stopPropagation();
    this.control.emit(controlName);
  }

  onPageNumberChange(event) {
    const number = parseInt(this.iconForm.controls.pageNumber.value);
    if(!isNaN(number) && (number >= 1 && number <= this.pages)) {
      this.currentPage = number;
      this.pageNumber.emit(this.currentPage);
    } else {
      this.iconForm.controls.pageNumber.setValue((this.currentPage) ? this.currentPage.toString():"1");
    }
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.keyCode === KEY_CODE.RIGHT_ARROW) {
      if(this.currentPage !== this.pages)
        this.control.emit('nextPage');
    }

    if (event.keyCode === KEY_CODE.LEFT_ARROW) {
      if(this.currentPage !== 1)
        this.control.emit('prevPage');
    }
  }

  onColourChange(colour: string) {
    this.colour.emit(colour);
  }

  onColourPickerClose(colour: string) {
    this.colourPickerClose.emit(colour);
  }

  onPaneNavigationClick(option: string) {
    this.paneDisplayOption.emit(option);
  }

  ngOnChanges() {
    if(this.iconForm)
      this.iconForm.controls.pageNumber.setValue(this.currentPage.toString());
  }
}
