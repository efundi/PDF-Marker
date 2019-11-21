import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {AppService} from "@coreModule/services/app.service";
import validate = WebAssembly.validate;
import {MarkTypeIconComponent} from "@pdfMarkerModule/components/mark-type-icon/mark-type-icon.component";


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

  constructor(private appService: AppService, private dialogRef: MatDialogRef<MarkingCommentModalComponent>,
              @Inject(MAT_DIALOG_DATA) config, private fb: FormBuilder, private markTypeIcon: MarkTypeIconComponent) {

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
  }

  ngOnInit() {

  }
  private initForm() {
    // @ts-ignore
      this.commentForm = this.fb.group({
        sectionLabel: new FormControl(null, Validators.required),
        markingComment: new FormControl(null),
        totalMark: new FormControl(null, Validators.required)
      });
  }

  onCancel($event: MouseEvent) {
    if(this.commentForm.valid) {
      const markingCommentObj = {sectionLabel: this.markTypeIcon.getSectionLabel(),  totalMark: this.markTypeIcon.getTotalMark(), markingComment: this.markTypeIcon.getComment()};
      this.dialogRef.close(markingCommentObj);
    }
    else {
      this.dialogRef.close(true);
    }
  }

  onSubmit($event: MouseEvent) {
    if (this.commentForm.valid) {
      this.markTypeIcon.setSectionLabel(this.commentForm.controls.sectionLabel.value);
      this.markTypeIcon.setTotalMark(this.commentForm.controls.totalMark.value);
      if (this.commentForm.controls.markingComment.value != null) {
        this.markTypeIcon.setComment(this.commentForm.controls.markingComment.value);
      }
      const markingCommentObj = {sectionLabel: this.commentForm.controls.sectionLabel.value,  totalMark: this.commentForm.controls.totalMark.value, markingComment: this.commentForm.controls.markingComment.value};
      this.dialogRef.close(markingCommentObj);
    }
  }
}
