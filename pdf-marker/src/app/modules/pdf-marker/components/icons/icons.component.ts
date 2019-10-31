import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {IconTypeEnum} from "@pdfMarkerModule/info-objects/icon-type.enum";
import {IconInfo} from "@pdfMarkerModule/info-objects/icon.info";

@Component({
  selector: 'pdf-marker-icons',
  templateUrl: './icons.component.html',
  styleUrls: ['./icons.component.scss']
})
export class IconsComponent implements OnInit {

  @Output()
  selection: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  control: EventEmitter<string> = new EventEmitter<string>();

  @Input()
  currentPage: number;

  @Input()
  pages: number;

  selecetedIcon: IconInfo;

  readonly markIcons: IconInfo[] = [
    { icon: 'check', type: IconTypeEnum.FULL_MARK, toolTip: 'Single Mark' },
    { icon: 'done_all', type: IconTypeEnum.HALF_MARK, toolTip: 'Half Mark' },
    { icon: 'spellcheck', type: IconTypeEnum.ACK_MARK, toolTip: 'Acknowledge Tick' },
    { icon: 'close', type: IconTypeEnum.CROSS, toolTip: 'Zero or Negative Mark'},
    { icon: 'iso', type: IconTypeEnum.NUMBER, toolTip: 'Points Assignment'}
  ];

  constructor() { }

  ngOnInit() {
  }

  onIconClick(event, selectedIcon: IconInfo) {
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

  onSave(event) {
    this.control.emit('save');
  }

  onClearAll(event) {
    this.control.emit('clearAll');
  }

}
