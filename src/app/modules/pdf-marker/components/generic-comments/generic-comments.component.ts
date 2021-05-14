import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material';
import { AlertService } from '@coreModule/services/alert.service';
import { AppService } from '@coreModule/services/app.service';
import { ElectronService } from '@coreModule/services/electron.service';
import { IComment } from '@coreModule/utils/comment.class';
import { CommentService } from '@pdfMarkerModule/services/comment.service';
import { ImportService } from '@pdfMarkerModule/services/import.service';
import { SettingsService } from '@pdfMarkerModule/services/settings.service';
import { AssignmentService } from '@sharedModule/services/assignment.service';

@Component({
  selector: 'pdf-marker-generic-comments',
  templateUrl: './generic-comments.component.html',
  styleUrls: ['./generic-comments.component.scss']
})
export class GenericCommentsComponent implements OnInit {


  isLoading$ = this.appService.isLoading$;
  readonly displayedColumns: string[] = ['title', 'actions', 'inUse'];
  genericCommentsForm: FormGroup;

  comments: IComment[];
  dataSource: MatTableDataSource<IComment>;

  constructor(private fb: FormBuilder,
              private settingsService: SettingsService,
              private appService: AppService,
              private commentsService: CommentService,
              private alertService: AlertService,
              private electronService: ElectronService,
              private assignmentService: AssignmentService) {
  }

  ngOnInit() {
    this.isLoading$.next(true);
    this.initForm();
    this.isLoading$.next(false);
  }

  private initForm() {

  }

  deleteComment(comment: string) {
  }

  get fc() {
    return this.genericCommentsForm.controls;
  }

  onSubmit(event) {
    this.alertService.clear();
    if (this.genericCommentsForm.invalid) {
      this.alertService.error('Please fill in the correct details!');
      return;
    }

    const formData: FormData = new FormData();
    formData.append('comment', this.fc.commentText.value);

    this.appService.isLoading$.next(true);
    this.commentsService.saveComments(formData).subscribe((comments: IComment[]) => {
      this.populateComments(comments);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, 'Rubric saved');
     // this.resetPreviousUpload();
    }, error => {
      this.appService.openSnackBar(false, 'Unable to save');
      this.appService.isLoading$.next(false);
    });
  }

  private populateComments(comments: IComment[]) {
    this.comments = comments;
    this.dataSource = new MatTableDataSource<IComment>(this.comments);
  }

}
