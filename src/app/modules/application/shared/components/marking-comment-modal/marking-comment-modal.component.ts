import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {AppService} from "@coreModule/services/app.service";
import {IComment} from '@coreModule/utils/comment.class';
import {CommentService} from '@pdfMarkerModule/services/comment.service';
import {MatSelectChange} from "@angular/material/select";

@Component({
  selector: 'pdf-marker-marking-comment-modal',
  templateUrl: './marking-comment-modal.component.html',
  styleUrls: ['./marking-comment-modal.component.scss']
})
export class MarkingCommentModalComponent implements OnInit {

  commentForm: FormGroup;
  private title: string;

  private message: string;

  private sectionLabel: string;

  private markingComment: string;

  readonly yes: boolean = true;

  readonly no: boolean = false;

  private totalMark: number = undefined;

  private  markingCommentObj: any;

  genericComments: IComment[] = [];

  commentCaretPos = 0;

  constructor(private appService: AppService,
              private dialogRef: MatDialogRef<MarkingCommentModalComponent>,
              @Inject(MAT_DIALOG_DATA) config,
              private fb: FormBuilder,
              private commentService: CommentService) {

    this.initForm();

    this.title = config.title;
    this.message = config.message;
    if (config.markingComment) {
      this.markingComment = config.markingComment;
      this.commentForm.controls.markingComment.setValue(config.markingComment);
    }
    if (config.sectionLabel) {
      this.sectionLabel = config.sectionLabel;
      this.commentForm.controls.sectionLabel.setValue(config.sectionLabel);
    }
    if (config.totalMark) {
      this.totalMark = config.totalMark;
      this.commentForm.controls.totalMark.setValue(config.totalMark);
    }

    this.commentService.getCommentDetails().subscribe((comments: IComment[]) => {
      this.genericComments = comments;
    });

    this.markingCommentObj = {
      sectionLabel: this.commentForm.controls.sectionLabel.value,
      totalMark: this.commentForm.controls.totalMark.value,
      markingComment: this.commentForm.controls.markingComment.value,
      genericComment: this.commentForm.controls.genericComment.value
    };
  }

  ngOnInit() {

  }
  private initForm() {
      this.commentForm = this.fb.group({
        sectionLabel: new FormControl(null, Validators.required),
        genericComment: new FormControl(null),
        markingComment: new FormControl(null),
        totalMark: new FormControl(null, Validators.required)
      });
  }

  onCancel($event: MouseEvent) {
    if(this.commentForm.valid) {
      //const markingCommentObj = {sectionLabel: this.markTypeIcon.getSectionLabel(),  totalMark: this.markTypeIcon.getTotalMark(), markingComment: this.markTypeIcon.getComment()};
      this.dialogRef.close(this.markingCommentObj);
    } else {
      const markingRemove = {removeIcon: true};
      this.dialogRef.close(markingRemove);
      }
  }

  onSubmit($event: MouseEvent) {
    if (this.commentForm.valid) {
      this.markingCommentObj = {
        sectionLabel: this.commentForm.controls.sectionLabel.value,
        totalMark: this.commentForm.controls.totalMark.value,
        markingComment: this.commentForm.controls.markingComment.value,
        genericComment: this.commentForm.controls.genericComment.value
      };
      this.dialogRef.close(this.markingCommentObj);
    }
  }

  appendGenericComment($event: MatSelectChange) {
    const commentText = this.commentForm.controls.markingComment.value;
    const textToInsert = $event.value;
    if (commentText && commentText.length > 0) {
      this.commentForm.controls.markingComment.patchValue([commentText.slice(0, this.commentCaretPos), textToInsert, commentText.slice(this.commentCaretPos)].join(''));
    } else {
      this.commentForm.controls.markingComment.patchValue(textToInsert);
    }
    $event.value = '';
    // Clear droplist
    this.commentForm.controls.genericComment.setValue('');
    this.commentForm.controls.genericComment.setErrors(null);

  }

  trackCommentCaretPosition(oField, $event) {
    if (oField.selectionStart || oField.selectionStart === 0) {
      this.commentCaretPos = oField.selectionStart;
    }
  }
}
