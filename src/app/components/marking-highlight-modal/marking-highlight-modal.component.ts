import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {IComment} from '@shared/info-objects/comment.class';
import {AppService} from '../../services/app.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {CommentService} from '../../services/comment.service';
import {MatSelectChange} from '@angular/material/select';
import {isNil} from "lodash";

@Component({
  selector: 'pdf-marker-marking-highlight-modal',
  templateUrl: './marking-highlight-modal.component.html',
  styleUrls: ['./marking-highlight-modal.component.scss']
})
export class MarkingHighlightModalComponent implements OnInit {


  commentForm: FormGroup;

  private sectionLabel: string;

  private markingComment: string;

  genericComments: IComment[] = [];

  commentCaretPos = 0;

  constructor(private appService: AppService,
              private dialogRef: MatDialogRef<MarkingHighlightModalComponent>,
              @Inject(MAT_DIALOG_DATA) private config,
              private fb: FormBuilder,
              private commentService: CommentService) {

    this.initForm();


  }

  ngOnInit() {
    this.commentService.getCommentDetails().subscribe((comments: IComment[]) => {
      this.genericComments = comments;
    });

    const model: any = {};

    if (!isNil(this.config.comment)) {
      const commentObj = this.config.comment;
      if (commentObj.markingComment) {
        model.markingComment = commentObj.markingComment;
      }
      if (commentObj.sectionLabel) {
        model.sectionLabel = commentObj.sectionLabel;
      }
    }

    this.commentForm.reset(model);
  }
  private initForm() {
    this.commentForm = this.fb.group({
      sectionLabel: new FormControl(null, Validators.required),
      genericComment: new FormControl(null),
      markingComment: new FormControl(null),
    });
  }

  onCancel($event: MouseEvent) {
    if (this.commentForm.valid) {
      this.dialogRef.close(null);
    } else {
      const markingRemove = {removeIcon: true};
      this.dialogRef.close(markingRemove);
    }
  }

  onSubmit($event: MouseEvent) {
    if (this.commentForm.valid) {
      const formValue = this.commentForm.value;
      const markingCommentObj = {
        sectionLabel: formValue.sectionLabel,
        totalMark: 0,
        markingComment: formValue.markingComment,
        genericComment: formValue.genericComment
      };
      this.dialogRef.close(markingCommentObj);
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
