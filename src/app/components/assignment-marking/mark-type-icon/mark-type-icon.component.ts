import {Component, ElementRef, Input, OnInit, Renderer2} from '@angular/core';
import {IconTypeEnum} from '@shared/info-objects/icon-type.enum';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {MatDialogConfig} from '@angular/material/dialog';
import {AppService} from '../../../services/app.service';
import {
  MarkingCommentModalComponent
} from '../marking-comment-modal/marking-comment-modal.component';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {cloneDeep, isEqual} from 'lodash';
import {
  AssignmentMarkingPageComponent
} from '../assignment-marking-page/assignment-marking-page.component';
import {
  AssignmentMarkingSessionService
} from '../assignment-marking-session.service';
import {CdkDragEnd} from '@angular/cdk/drag-drop';

@Component({
  selector: 'pdf-marker-mark-type-icon',
  templateUrl: './mark-type-icon.component.html',
  styleUrls: ['./mark-type-icon.component.scss']
})
export class MarkTypeIconComponent implements OnInit {

  static readonly widthAndHeight: number = 36;

  @Input()
  editEnabled: boolean;

  iconForm: UntypedFormGroup;

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



  constructor(private fb: UntypedFormBuilder,
              private appService: AppService,
              private elementRef: ElementRef,
              private renderer: Renderer2,
              private assignmentMarkingPageComponent: AssignmentMarkingPageComponent,
              private assignmentMarkingSessionService: AssignmentMarkingSessionService) {}

  private positionTick() {
    const zoom = this.assignmentMarkingSessionService.zoom;

    /*
     * The coordinates are saved at the top left of the icon, find the middle
     * of the icon to properly position at any zoom level (the icon stays the same size)
     */
    const ICON_MIDDLE = (MarkTypeIconComponent.widthAndHeight / 2);

    /*
     * Add the middle of the icon to the original coordinate
     * Multiply by the zoom
     * Subtract the middle from the icon
     * Now the icon will be placed correctly for the zoom level
     */
    const top = ((this.mark.coordinates.y + ICON_MIDDLE) * zoom) - ICON_MIDDLE;
    const left = ((this.mark.coordinates.x + ICON_MIDDLE) * zoom) - ICON_MIDDLE;

    // Now position the icon
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
   * Callback after dragging has completed
   * @param event
   */
  onDragEnded(event: CdkDragEnd) {
    // Keep a copy of the original mark - incase the save fails and we need to reset
    const updatedMark: MarkInfo = cloneDeep(this.mark);

    // Update coordinates to the new location based on the distance moved in the event
    const zoom = this.assignmentMarkingSessionService.zoom;

    // The actual distance moved at 100% zoom
    const changeX = event.distance.x / zoom;
    const changeY = event.distance.y / zoom;

    updatedMark.coordinates.x += changeX;
    updatedMark.coordinates.y += changeY;

    this.assignmentMarkingPageComponent.onMarkChanged(this.index, updatedMark)
      .subscribe({
        next: () => {
          // If the save was not a success, reset the mark to original location
          this.mark.coordinates.x = updatedMark.coordinates.x;
          this.mark.coordinates.y = updatedMark.coordinates.y;

          // Reposition the icon
          this.positionTick();

          // Clear drag transforms - we've already placed the icon at the correct top/left position
          event.source.reset();
        },
        error: () => {
          // Reposition the icon
          this.positionTick();

          // Clear drag transforms - we've already placed the icon at the correct top/left position
          event.source.reset();
        }
      });
  }

  onTotalMarkChange() {
    const number = parseFloat(this.iconForm.controls['totalMark'].value);
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
      comment : {
        markingComment: this.mark.comment,
        sectionLabel: this.mark.sectionLabel,
        totalMark: this.mark.totalMark,
      }
    };

    const handleCommentFN = (formData: any) => {
      if (formData) {
        const updateMark = cloneDeep(this.mark);
        updateMark.totalMark = formData.totalMark;
        updateMark.sectionLabel = formData.sectionLabel;
        updateMark.comment = formData.markingComment;

        if (this.iconForm) {
          this.iconForm.controls['totalMark'].setValue(this.mark.totalMark);
        }

        this.assignmentMarkingPageComponent.onMarkChanged(this.index, updateMark).subscribe(() => {
          this.mark.totalMark = updateMark.totalMark;
          this.mark.sectionLabel = updateMark.sectionLabel;
          this.mark.comment = updateMark.comment;
        });
      }
    };
    this.appService.createDialog(MarkingCommentModalComponent, config, handleCommentFN);
  }
}
