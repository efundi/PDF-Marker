import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {AppService} from "@coreModule/services/app.service";

@Component({
  selector: 'pdf-marker-marking-comment-modal',
  templateUrl: './marking-comment-modal.component.html',
  styleUrls: ['./marking-comment-modal.component.scss']
})
export class MarkingCommentModalComponent implements OnInit {

  commentForm: FormGroup;
  title: string;

  message: string;

  sectionLabel: string;

  comment: string;


  readonly yes: boolean = true;

  readonly no: boolean = false;

  constructor(private appService: AppService, private dialogRef: MatDialogRef<MarkingCommentModalComponent>,
              @Inject(MAT_DIALOG_DATA) config, private fb: FormBuilder) {
    this.title = config.title;
    this.message = config.message;
  }

  ngOnInit() {
  }

  private initForm() {
    this.commentForm = this.fb.group({
      sectionLabel: [null, Validators.required],
      markingComment: [null]
    });
  }


  onCancel($event: MouseEvent) {
    this.dialogRef.close(true);
  }

  onSubmit($event: MouseEvent) {
    if (this.commentForm.invalid) {
     // event.target.disabled = true;
      return;
    } else {
      this.sectionLabel = this.commentForm.controls.sectionLabel.value;
      if (this.commentForm.controls.comment.value != null) {
        this.comment = this.commentForm.controls.comment.value;
      }
    }
  }
}
