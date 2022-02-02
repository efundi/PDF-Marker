import {Component, ComponentRef, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Renderer2} from '@angular/core';
import {IconTypeEnum} from '@pdfMarkerModule/info-objects/icon-type.enum';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatDialogConfig} from '@angular/material/dialog';
import {AppService} from '@coreModule/services/app.service';
import {
  MarkingCommentModalComponent
} from '@sharedModule/components/marking-comment-modal/marking-comment-modal.component';
import {MarkInfo} from '@sharedModule/info-objects/mark.info';
import {cloneDeep, isEqual} from 'lodash-es';
import {CdkDragEnd} from '@angular/cdk/drag-drop/drag-events';
import {
  AssignmentMarkingPageComponent
} from '@pdfMarkerModule/components/assignment-marking-page/assignment-marking-page.component';
import {
  AssignmentMarkingSessionService
} from "@pdfMarkerModule/components/assignment-marking/assignment-marking-session.service";

@Component({
  selector: 'pdf-marker-mark-type-icon',
  templateUrl: './mark-type-icon.component.html',
  styleUrls: ['./mark-type-icon.component.scss']
})
export class MarkTypeIconComponent implements OnInit, OnDestroy {

  static readonly widthAndHeight: number = 36;



  iconForm: FormGroup;
  showOptions: boolean;

  config: MatDialogConfig;

  /**
   * The mark represented by this component
   */
  @Input()
  mark: MarkInfo;

  /**
   * The mark represented by this component
   */
  @Input()
  index: number;

  iconTypeEnum = IconTypeEnum;



  constructor(private fb: FormBuilder,
              private appService: AppService,
              private elementRef: ElementRef,
              private renderer: Renderer2,
              private assignmentMarkingPageComponent: AssignmentMarkingPageComponent,
              private assignmentMarkingSessionService: AssignmentMarkingSessionService) {}

  ngOnDestroy() {
  }

  private positionTick() {
    const zoom = this.assignmentMarkingSessionService.zoom;

    const ICON_MIDDEL = (MarkTypeIconComponent.widthAndHeight / 2);

    const top = ((this.mark.coordinates.y + ICON_MIDDEL) * zoom) - ICON_MIDDEL;
    const left = ((this.mark.coordinates.x + ICON_MIDDEL) * zoom) - ICON_MIDDEL;


    this.renderer.setStyle(this.elementRef.nativeElement, 'top', top + 'px');
    this.renderer.setStyle(this.elementRef.nativeElement, 'left', left + 'px');

  }

  ngOnInit() {
    this.positionTick();
    this.initForm();
    this.assignmentMarkingSessionService.zoomChanged.subscribe(() => this.positionTick());
  }

  private initForm() {
    if (this.mark.iconType === IconTypeEnum.NUMBER) {
      this.iconForm = this.fb.group({
        totalMark: [(this.mark.totalMark) ? this.mark.totalMark : 0, Validators.required]
      });
    } else if (this.mark.iconType === IconTypeEnum.COMMENT) {
      this.iconForm = this.fb.group({
        comment: [null, Validators.required]
      });
    } else {
      this.iconForm = this.fb.group({});
    }
  }

  /**
   * Callback when the edit button is clicked
   * @param event
   */
  onEdit(event: MouseEvent) {
    this.openMarkingCommentModal('Marking Comment', '');
    event.stopPropagation();
  }

  /**
   * Callback when the remove button is clicked
   * @param event
   */
  onRemove(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.assignmentMarkingPageComponent.onMarkChanged(this.index, null).subscribe();
  }

  /**
   * Callback when the icon is clicked
   * @param event
   */
  onClicked(event: MouseEvent) {
    event.stopPropagation();
  }

  /**
   * Callback when the mouse is over the icon
   * @param event
   */
  onMouseOver(event: MouseEvent) {
    this.showOptions = true;
    event.stopPropagation();
  }

  /**
   * Callback when the mouse leaves the icon
   * @param event
   */
  onMouseLeave(event: MouseEvent) {
    this.showOptions = false;
    event.stopPropagation();
  }

  /**
   * Callback after dragging has completed
   * @param event
   */
  onDragEnded(event: CdkDragEnd) {
    // Keep a copy of the original mark - incase the save fails and we need to reset
    const updatedMark: MarkInfo = cloneDeep(this.mark);

    // Update coordinates to the new location based on the distance moved in the event
    const ICON_MIDDEL = (MarkTypeIconComponent.widthAndHeight / 2);
    const zoom = this.assignmentMarkingSessionService.zoom;

    const changeX = event.distance.x / zoom;
    const changeY = event.distance.y / zoom;


    updatedMark.coordinates.x += changeX;
    updatedMark.coordinates.y += changeY;

    this.assignmentMarkingPageComponent.onMarkChanged(this.index, updatedMark)
      .subscribe({
        next: (success) => {
          // If the save was not a success, reset the mark to original location
          this.mark.coordinates.x = updatedMark.coordinates.x;
          this.mark.coordinates.y = updatedMark.coordinates.y;
        },
        error: () => {

        },
        complete: () => {
          // D&D uses transform to move the element, take the movement and instead apply it to the top/left positioning
          this.positionTick();

          // Clear drag transforms - we've already placed the icon at the correct top/left position
          event.source.reset();
        }
      });
  }

  onTotalMarkChange(event: MouseEvent) {
    const number = parseInt(this.iconForm.controls.totalMark.value, 10);
    if (!isNaN(number)) {
      const updatedMark: MarkInfo = cloneDeep(this.mark);
      updatedMark.totalMark = number;
      if (!isEqual(updatedMark, this.mark)) {
        // Only update if something has changed
        this.assignmentMarkingPageComponent.onMarkChanged(this.index, updatedMark).subscribe(
          {
            next : () => {
              this.mark.totalMark = updatedMark.totalMark;
            },
            error: () => {
              // If an invalid number is entered, reset
              this.iconForm.reset({
                totalMark: (this.mark.totalMark) ? this.mark.totalMark : 0
              });
            }}
        );
      }
    } else {
      // If an invalid number is entered, reset
      this.iconForm.reset({
        totalMark: (this.mark.totalMark) ? this.mark.totalMark : 0
      });
    }
  }

  private openMarkingCommentModal(title: string = 'Marking Comment', message: string) {
    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '500px';
    config.data = {
      markingComment: this.mark.comment,
      sectionLabel: this.mark.sectionLabel,
      totalMark: this.mark.totalMark,
    };

    const handleCommentFN = (formData: any) => {
      const updateMark = cloneDeep(this.mark);
      console.log('Form Data is', formData);
      updateMark.totalMark = formData.totalMark;
      updateMark.sectionLabel = formData.sectionLabel;
      updateMark.comment = formData.markingComment;

      if (this.iconForm) {
        this.iconForm.controls.totalMark.setValue(this.mark.totalMark);
      }

      this.assignmentMarkingPageComponent.onMarkChanged(this.index, updateMark).subscribe(() => {
          this.mark.totalMark = updateMark.totalMark;
          this.mark.sectionLabel = updateMark.sectionLabel;
          this.mark.comment = updateMark.markingComment;
      });
    };
    this.appService.createDialog(MarkingCommentModalComponent, config, handleCommentFN);
  }
}
