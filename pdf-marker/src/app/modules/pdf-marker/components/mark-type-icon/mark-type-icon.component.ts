import {Component, ComponentRef, Input, OnInit} from '@angular/core';
import {IconTypeEnum} from "@pdfMarkerModule/info-objects/icon-type.enum";

@Component({
  selector: 'pdf-marker-mark-type-icon',
  templateUrl: './mark-type-icon.component.html',
  styleUrls: ['./mark-type-icon.component.scss']
})
export class MarkTypeIconComponent implements OnInit {

  @Input()
  iconName: string;

  private readonly widthAndHeight: number = 36;

  private coordinates = {
    x: 0,
    y: 0
  };

  private index: number;

  private markType: IconTypeEnum;

  private componentReferene: ComponentRef<MarkTypeIconComponent>;

  private isDeleted: boolean = false;

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
    this.isDeleted = true;
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
    // emit change event here
  }

  setComponentRef(componentReference: ComponentRef<MarkTypeIconComponent>) {
    this.componentReferene = componentReference;
    this.coordinates.x = parseInt(this.componentReferene.location.nativeElement.style.left.replace("px", ""));
    this.coordinates.y = parseInt(this.componentReferene.location.nativeElement.style.top.replace("px", ""));
    console.log("On init", this.coordinates);
  }

  getCoordinates() {
    return this.coordinates;
  }

  setIndex(index: number) {
    this.index = index;
  }

  setMarkType(markType: IconTypeEnum) {
    this.markType = markType;
  }

  setIsDeleted(isDeleted: boolean) {
    this.isDeleted = isDeleted;
  }

  getMarkType(): IconTypeEnum {
    return this.markType;
  }

  get deleted(): boolean {
    return this.isDeleted;
  }

  get dimensions() {
    return this.widthAndHeight;
  }
}
