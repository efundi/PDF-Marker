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
    { icon: 'check', type: IconTypeEnum.FULL_MARK },
    { icon: 'done_all', type: IconTypeEnum.HALF_MARK },
    { icon: 'spellcheck', type: IconTypeEnum.ACK_MARK },
    { icon: 'close', type: IconTypeEnum.CROSS},
    { icon: 'iso', type: IconTypeEnum.NUMBER}
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
    console.log("IconsComponent");
    this.control.emit('save');
  }

}
