import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {AppService} from '../../../services/app.service';
import {IComment} from '@shared/info-objects/comment.class';
import {CommentService} from '../../../services/comment.service';
import {MatSelectChange} from '@angular/material/select';
import {Subscription} from 'rxjs';
import {isNil} from 'lodash';

@Component({
  selector: 'pdf-marker-marking-comment-modal',
  templateUrl: './marking-comment-modal.component.html',
  styleUrls: ['./marking-comment-modal.component.scss']
})
export class MarkingCommentModalComponent implements OnInit, OnDestroy {

  commentForm: UntypedFormGroup;

  private formSubscription: Subscription;

  genericComments: IComment[] = [];

  commentCaretPos = 0;

  commentTypes = [
    'Assess',
    'Comment Only'
  ];

  constructor(private appService: AppService,
              private dialogRef: MatDialogRef<MarkingCommentModalComponent>,
              @Inject(MAT_DIALOG_DATA) private config,
              private fb: UntypedFormBuilder,
              private commentService: CommentService) {

    this.initForm();
  }

  ngOnInit() {
    this.commentService.getCommentDetails().subscribe((comments: IComment[]) => {
      this.genericComments = comments;
    });

    const model: any = {
      commentType : 'Assess'
    };

    if (!isNil(this.config.comment)) {
      const commentObj = this.config.comment;
      if (commentObj.markingComment) {
        model.markingComment = commentObj.markingComment;
      }
      if (commentObj.sectionLabel) {
        model.sectionLabel = commentObj.sectionLabel;
      }
      if (isNil(commentObj.totalMark)) {
        model.commentType = 'Comment Only';

      } else {
        model.totalMark = commentObj.totalMark;
      }
    }

    this.toggleTotalMark(model.commentType === 'Assess');
    this.commentForm.reset(model);
  }

  private initForm() {
    this.commentForm = this.fb.group({
      commentType: new UntypedFormControl(null, Validators.required),
      sectionLabel: new UntypedFormControl(null, Validators.required),
      genericComment: new UntypedFormControl(null),
      markingComment: new UntypedFormControl(null),
    });

    this.formSubscription = this.commentForm.controls.commentType.valueChanges.subscribe((commentType) => {
      this.toggleTotalMark(commentType === 'Assess');
    });
  }

  ngOnDestroy() {
    this.formSubscription.unsubscribe();
  }

  private toggleTotalMark(show: boolean) {
    if (show) {
      this.commentForm.addControl('totalMark', new UntypedFormControl(null, Validators.required));
    } else {
      this.commentForm.removeControl('totalMark');
    }
    this.commentForm.updateValueAndValidity();
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
        totalMark: formValue.totalMark,
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
