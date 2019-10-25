import {Component, ComponentFactoryResolver, ComponentRef, Input, OnInit} from '@angular/core';

@Component({
  selector: 'pdf-marker-mark-type-icon',
  templateUrl: './mark-type-icon.component.html',
  styleUrls: ['./mark-type-icon.component.scss']
})
export class MarkTypeIconComponent implements OnInit {

  @Input()
  iconName: string;

  private coordinates = {
    x: 0,
    y: 0
  };

  private componentReferene: ComponentRef<MarkTypeIconComponent>;

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

  onDrageEnded(event) {
    console.log(event);
    this.coordinates.x += event.distance.x;
    this.coordinates.y += event.distance.y;
    console.log("After drag", this.coordinates);
  }

  setComponentRef(componentReference: ComponentRef<MarkTypeIconComponent>) {
    this.componentReferene = componentReference;
    this.coordinates.x = parseInt(this.componentReferene.location.nativeElement.style.left.replace("px", ""));
    this.coordinates.y = parseInt(this.componentReferene.location.nativeElement.style.top.replace("px", ""));
    console.log("On init", this.coordinates);
  }
}
