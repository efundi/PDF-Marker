import {Component, ComponentRef, Input, OnInit} from '@angular/core';
import {IconTypeEnum} from "@pdfMarkerModule/info-objects/icon-type.enum";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {MatDialogConfig} from "@angular/material/dialog";
import {FinaliseMarkingComponent} from "@pdfMarkerModule/components/finalise-marking/finalise-marking.component";
import {AppService} from "@coreModule/services/app.service";
import {MarkingCommentModalComponent} from "@sharedModule/components/marking-comment-modal/marking-comment-modal.component";

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

  sectionLabel: string;

  markType: IconTypeEnum;

  iconTypeEnum = IconTypeEnum;

  showOptions: boolean;

  colour: string;

  config: MatDialogConfig;

  constructor(private fb: FormBuilder, private appService: AppService) {}

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
    this.openMarkingCommentModal("Marking Comment", "");
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
    if (this.iconForm) {
      this.iconForm.controls.totalMark.setValue(totalMark);
    }
    this.totalMark = totalMark;
  }

  getTotalMark(): number {
    return this.totalMark;
  }

  setComment(comment: string) {
    this.comment = comment;
  }

  getComment(): string {
    return this.comment;
  }

  setSectionLabel(label: string) {
    this.sectionLabel = label;
  }

  getSectionLabel(): string {
    return this.sectionLabel;
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

  private openMarkingCommentModal(title: string = 'Marking Comment', message: string) {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "500px";
    config.data = {
      markingComment: this.comment,
      sectionLabel: this.sectionLabel,
      totalMark: this.totalMark
    };
    const handelCommentFN = (formData: any) => {
      console.log(formData);
      this.totalMark = formData.totalMark;
      this.sectionLabel = formData.sectionLabel;
      this.comment = formData.markingComment;
    };
    this.appService.createDialog(MarkingCommentModalComponent, config, handelCommentFN);
}

}
