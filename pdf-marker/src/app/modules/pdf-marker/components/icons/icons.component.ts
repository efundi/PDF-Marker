import {Component, EventEmitter, OnInit, Output} from '@angular/core';

@Component({
  selector: 'pdf-marker-icons',
  templateUrl: './icons.component.html',
  styleUrls: ['./icons.component.scss']
})
export class IconsComponent implements OnInit {

  @Output()
  selection: EventEmitter<string> = new EventEmitter<string>();
  selecetedIcon: string;

  readonly icons = [
    { icon: 'check'},
    { icon: 'done_all'},
    { icon: 'done_outline'},
    { icon: 'check_circle'},
    { icon: 'check_circle_outline'},
  ];

  constructor() { }

  ngOnInit() {
  }

  onIconClick(event, selectedIcon) {
    if(this.selecetedIcon === selectedIcon) {
      this.selecetedIcon = undefined;
      this.selection.emit(undefined);
    }
    else {
      // emit selectedIcon to marking component
      this.selecetedIcon = selectedIcon;
      this.selection.emit(selectedIcon);
    }
  }

}
