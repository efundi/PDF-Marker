import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material';
import { AlertService } from '@coreModule/services/alert.service';
import { AppService } from '@coreModule/services/app.service';
import { IComment } from '@coreModule/utils/comment.class';
import { CommentService } from '@pdfMarkerModule/services/comment.service';
import { SettingsService } from '@pdfMarkerModule/services/settings.service';
import {MatDialogConfig} from '@angular/material/dialog';
import {YesAndNoConfirmationDialogComponent} from '@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';

@Component({
  selector: 'pdf-marker-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss']
})
export class GenericCommentsComponent implements OnInit {


  readonly displayedColumns: string[] = ['title', 'actions', 'inUse'];
  genericCommentsForm: FormGroup;

  comments: IComment[];
  dataSource: MatTableDataSource<IComment>;

  constructor(private fb: FormBuilder,
              private settingsService: SettingsService,
              private appService: AppService,
              private commentsService: CommentService,
              private alertService: AlertService) {
  }

  ngOnInit() {
    this.appService.isLoading$.next(true);
    this.initForm();
    this.commentsService.getCommentDetails().subscribe((comments: IComment[]) => {
      this.populateComments(comments);
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, 'Unable to retrieve rubrics');
      this.appService.isLoading$.next(false);
    });

    this.appService.isLoading$.next(false);
  }

  private populateComments(comments: IComment[]) {
    this.comments = comments;
    this.dataSource = new MatTableDataSource<IComment>(this.comments);
  }

  private initForm() {
    this.genericCommentsForm = this.fb.group({
      newComment: [null, Validators.required],
    });
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
      this.populateComments(comments);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, 'Comment saved');
    }, error => {
      this.appService.openSnackBar(false, 'Unable to save comment');
      this.appService.isLoading$.next(false);
    });
  }

  deleteComment(id: string) {
    const data = {id};
    this.appService.isLoading$.next(true);
    this.commentsService.deleteCommentCheck(data).subscribe((inUse: boolean) => {
      if (inUse) {
        const config = new MatDialogConfig();
        config.width = '400px';
        config.maxWidth = '400px';
        config.data = {
          title: 'Confirmation',
          message: 'This comment is in use, are your sure you want to delete it?'
        };
        const shouldDeleteFn = (shouldDelete: boolean) => {
          if (shouldDelete) {
            this.deleteCommentImpl(id, shouldDelete);
          }
        };

        this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldDeleteFn);
      } else {
        this.deleteCommentImpl(id, true);
      }
    }, error => {
      this.appService.openSnackBar(false, 'Unable to delete comment');
      this.appService.isLoading$.next(false);
    });
  }

  private deleteCommentImpl(id: string, confirmation: boolean) {
    const newData = { id, confirmation};
    this.commentsService.deleteComment(newData).subscribe((comments: IComment[]) => {
      this.populateComments(comments);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, 'Comment deleted');
    }, error => {
      this.appService.openSnackBar(false, 'Unable to deleted comment');
      this.appService.isLoading$.next(false);
    });
  }

}
