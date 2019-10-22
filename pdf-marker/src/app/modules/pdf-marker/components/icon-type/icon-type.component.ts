import {Component, ComponentFactoryResolver, ComponentRef, Input, OnInit} from '@angular/core';

@Component({
  selector: 'pdf-marker-icon-type',
  templateUrl: './icon-type.component.html',
  styleUrls: ['./icon-type.component.scss']
})
export class IconTypeComponent implements OnInit {

  @Input()
  iconName: string;

  private componentReferene: ComponentRef<IconTypeComponent>;

  showOptions: boolean;

  constructor() { }

  ngOnInit() {
  }

  onEdit(event) {
    event.stopPropagation();
  }

  onRemove(event) {
    if(this.componentReferene)
      this.componentReferene.destroy();
    event.stopPropagation();
  }

  onClicked(event) {
    event.stopPropagation();
  }

  onMouseOver(event) {
    this.showOptions = true;
    event.stopPropagation();
  }

  onMouseLeave(event) {
    this.showOptions = false;
    event.stopPropagation();
  }

  setComponentRef(componentReference: ComponentRef<IconTypeComponent>) {
    this.componentReferene = componentReference;
  }
}
