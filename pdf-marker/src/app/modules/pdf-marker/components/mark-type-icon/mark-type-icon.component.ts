import {Component, ComponentRef, OnInit} from '@angular/core';
import {IconTypeEnum} from "@pdfMarkerModule/info-objects/icon-type.enum";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {MatDialogConfig} from "@angular/material/dialog";
import {AppService} from "@coreModule/services/app.service";
import {MarkingCommentModalComponent} from "@sharedModule/components/marking-comment-modal/marking-comment-modal.component";
import {AssignmentMarkingComponent} from "@pdfMarkerModule/components/assignment-marking/assignment-marking.component";

@Component({
  selector: 'pdf-marker-mark-type-icon',
  templateUrl: './mark-type-icon.component.html',
  styleUrls: ['./mark-type-icon.component.scss']
})
export class MarkTypeIconComponent implements OnInit {

  iconName: string;

  private readonly widthAndHeight: number = 36;

  private coordinates = {
    x: 0,
    y: 0
  };

  private componentReferene: ComponentRef<MarkTypeIconComponent>;

  private isDeleted: boolean = false;

  private totalMark: number = undefined;

  private readonly defaultColour: string = "#6F327A";

  private pageNumber: number;

  private assignmentMarkingComponentRef: AssignmentMarkingComponent;

  iconForm: FormGroup;

  comment: string;

  hasComment: boolean;

  sectionLabel: string;

  markType: IconTypeEnum;

  iconTypeEnum = IconTypeEnum;

  showOptions: boolean;

  colour: string;

  config: MatDialogConfig;

  isDisplay: boolean;

  private red: number;

  private green: number;

  private blue: number;

  constructor(private fb: FormBuilder,
              private appService: AppService) {}

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
    this.isDeleted = true;
    this.assignmentMarkingComponentRef.saveMarks().then((isSaved: boolean) => {
      if(isSaved) {
        if(this.componentReferene)
          this.componentReferene.destroy();
        this.appService.openSnackBar(true, "Removed");
      } else {
        this.isDeleted = false;
        this.appService.openSnackBar(false, "Unable to remove");
      }
    }).catch(() => {
      this.isDeleted = false;
      this.appService.openSnackBar(false, "Unable to remove");
    });
    if(event)
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

  onDragedEnded(event) {
    this.coordinates.x += event.distance.x;
    this.coordinates.y += event.distance.y;

    this.assignmentMarkingComponentRef.saveMarks().then((isSaved: boolean) => {
      if(isSaved) {
        this.appService.openSnackBar(true, "Saved");
      } else {
        this.appService.openSnackBar(false, "Unable to save");
      }
    }).catch(() => {
      this.appService.openSnackBar(false, "Unable to save");
    });
  }

  onTotalMarkChange(event) {
    const number = parseInt(this.iconForm.controls.totalMark.value);
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

  setAssignmentMarkingRef(assignmentMarkingComponentRef: AssignmentMarkingComponent) {
    this.assignmentMarkingComponentRef = assignmentMarkingComponentRef;
  }

  getComponentRef() {
    return this.componentReferene;
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
    if (comment !== null && comment !== "") {
      this.hasComment = true;
      this.comment = comment;
    } else {
      this.hasComment = false;
    }
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

  setColour(colour: string) {
    this.colour = this.isColour(colour) ? colour:this.defaultColour;
  }

  getColour(): string {
    return this.colour;
  }

  setPageNumber(pageNumber: number) {
    this.pageNumber = pageNumber;
  }

  getPageNumber(): number {
    return this.pageNumber;
  }

  setIconName(iconName: string) {
    this.iconName = iconName;
  }

  getIconName(): string {
    return this.iconName;
  }

  isColour(colour: string): boolean {
    const style = new Option().style;
    style.color = colour;
    if(style.color !== "") {
      const regEx = /\(([0-9]+), ([0-9]+), ([0-9]+)\)/g;
      const matches = regEx.exec(style.color);
      if(matches && matches.length == 4) {
        this.red = this.getRgbScale(+matches[1]);
        this.green = this.getRgbScale(+matches[2]);
        this.blue = this.getRgbScale(+matches[3]);
      }
    }
    return style.color !== "";
  }

  private getRgbScale(rgbValue: number): number {
    return +parseFloat(((rgbValue / 255) + "")).toFixed(2);
  }

  get deleted(): boolean {
    return this.isDeleted;
  }

  get dimensions() {
    return this.widthAndHeight;
  }

  get redColour() {
    return this.red;
  }

  get greenColour() {
    return this.green;
  }

  get blueColour() {
    return this.blue;
  }

  private openMarkingCommentModal(title: string = 'Marking Comment', message: string) {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "500px";
    config.data = {
      markingComment: this.comment,
      sectionLabel: this.sectionLabel,
      totalMark: this.totalMark,
      componentRef: this.componentReferene
    };

    const handelCommentFN = (formData: any) => {
      console.log("Form Data is", formData);
      this.totalMark = formData.totalMark;
      this.sectionLabel = formData.sectionLabel;
      this.comment = formData.markingComment;

      if(this.iconForm) {
        this.iconForm.controls.totalMark.setValue(this.totalMark);
      }

      this.assignmentMarkingComponentRef.saveMarks().then((isSaved: boolean) => {
        if(isSaved) {
          this.appService.openSnackBar(true, "Saved");
        } else {
          this.appService.openSnackBar(false, "Unable to save");
        }
      });
    };
    this.appService.createDialog(MarkingCommentModalComponent, config, handelCommentFN);
  }
}
