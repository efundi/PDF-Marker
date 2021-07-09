import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  selector: 'pdf-marker-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss']
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
    this.genericCommentsForm = this.fb.group({
      newComment: [Validators.required],
    });
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
    formData.append('newComment', this.fc.newComment.value);
    this.appService.isLoading$.next(true);
    this.commentsService.saveComments( this.genericCommentsForm.value).subscribe((comments: IComment[]) => {
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, 'Comment saved');
      //this.resetPreviousUpload();
    }, error => {
      this.appService.openSnackBar(false, 'Unable to sav comment');
      this.appService.isLoading$.next(false);
    });
  }

  private populateComments(comments: IComment[]) {
    this.comments = comments;
    this.dataSource = new MatTableDataSource<IComment>(this.comments);
  }

}
