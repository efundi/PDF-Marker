import {Component, ComponentRef, Input, OnInit} from '@angular/core';
import {IconTypeEnum} from "@pdfMarkerModule/info-objects/icon-type.enum";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";

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

  private componentReferene: ComponentRef<MarkTypeIconComponent>;

  private isDeleted: boolean = false;

  private totalMark: number = undefined;

  iconForm: FormGroup;

  comment: string;

  markType: IconTypeEnum;

  iconTypeEnum = IconTypeEnum;

  showOptions: boolean;

  colour: string;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    if(this.markType === IconTypeEnum.NUMBER) {
      this.iconForm = this.fb.group({
        totalMark: [(this.totalMark) ? this.totalMark:0, Validators.required]
      });
    } else if(this.markType === IconTypeEnum.COMMENT) {
      this.iconForm = this.fb.group({
        comment: [null, Validators.required]
      });
    } else {
      this.iconForm = this.fb.group({});
    }
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
    this.coordinates.x += event.distance.x;
    this.coordinates.y += event.distance.y;
  }

  onTotalMarkChange(event) {
    const number = parseInt(this.iconForm.controls.totalMark.value);
    console.log(number);
    if(!isNaN(number)) {
      this.totalMark = number;
      this.iconForm.controls.totalMark.setValue(this.totalMark);
    } else {
      this.iconForm.controls.totalMark.setValue((this.totalMark) ? this.totalMark:0);
    }
  }

  setComponentRef(componentReference: ComponentRef<MarkTypeIconComponent>) {
    this.componentReferene = componentReference;
    this.coordinates.x = parseInt(this.componentReferene.location.nativeElement.style.left.replace("px", ""));
    this.coordinates.y = parseInt(this.componentReferene.location.nativeElement.style.top.replace("px", ""));
  }

  getCoordinates() {
    return this.coordinates;
  }

  setTotalMark(totalMark: number) {
    this.totalMark = totalMark;
  }

  getTotalMark(): number {
    return this.totalMark;
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
