import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertService } from '../../services/alert.service';
import { AppService } from '../../services/app.service';
import { IComment } from '@shared/info-objects/comment.class';
import { CommentService } from '../../services/comment.service';
import { SettingsService } from '../../services/settings.service';
import {MatDialogConfig} from '@angular/material/dialog';
import {YesAndNoConfirmationDialogComponent} from '../yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {MatTableDataSource} from '@angular/material/table';

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

    this.appService.isLoading$.next(true);
    this.commentsService.addComment( this.genericCommentsForm.value.newComment).subscribe((comments: IComment[]) => {
      this.populateComments(comments);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, 'Comment saved');
      this.genericCommentsForm.reset();
    }, error => {
      this.appService.openSnackBar(false, 'Unable to save comment');
      this.appService.isLoading$.next(false);
    });
  }

  deleteComment(item: IComment) {
    this.appService.isLoading$.next(true);
    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '400px';
    config.data = {
      title: 'Confirmation',
      message: item.inUse ? 'This comment is in use, are your sure you want to delete it?' : 'Are you sure you want to delete this comment?'
    };
    const shouldDeleteFn = (shouldDelete: boolean) => {
      if (shouldDelete) {
        this.deleteCommentImpl(item.id);
      }
    };

    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldDeleteFn);

  }

  private deleteCommentImpl(id: string) {
    this.commentsService.deleteComment(id).subscribe((comments: IComment[]) => {
      this.populateComments(comments);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, 'Comment deleted');
    }, error => {
      this.appService.openSnackBar(false, 'Unable to delete comment');
      this.appService.isLoading$.next(false);
    });
  }

}
