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
import {BusyService} from "../../services/busy.service";

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
              private busyService: BusyService,
              private alertService: AlertService) {

    this.initForm();
  }

  ngOnInit() {
    this.busyService.start();
    this.commentsService.getCommentDetails().subscribe({
      next: (comments: IComment[]) => {
        this.populateComments(comments);
        this.busyService.stop();
      },
      error: (error) => {
        this.appService.openSnackBar(false, 'Unable to retrieve rubrics');
        this.busyService.stop();
      }
    });
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

    this.busyService.start();
    this.commentsService.addComment( this.genericCommentsForm.value.newComment).subscribe({
      next: (comments: IComment[]) => {
        this.populateComments(comments);
        this.appService.openSnackBar(true, 'Comment saved');
        this.genericCommentsForm.reset();
        this.busyService.stop();
      },
      error: (error) => {
        this.appService.openSnackBar(false, 'Unable to save comment');
        this.busyService.stop();
      },
    });
  }

  deleteComment(item: IComment) {
    this.busyService.start();
    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '400px';
    config.data = {
      title: 'Confirmation',
      message: item.inUse ? 'This comment is in use, are your sure you want to delete it?' : 'Are you sure you want to delete this comment?'
    };
    const shouldDeleteFn = (shouldDelete: boolean) => {
      this.busyService.stop();
      if (shouldDelete) {
        this.deleteCommentImpl(item.id);
      }
    };

    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldDeleteFn);

  }

  private deleteCommentImpl(id: string) {
    this.busyService.start();
    this.commentsService.deleteComment(id).subscribe((comments: IComment[]) => {
      this.populateComments(comments);
      this.busyService.stop();
      this.appService.openSnackBar(true, 'Comment deleted');
    }, error => {
      this.appService.openSnackBar(false, 'Unable to delete comment');
      this.busyService.stop();
    });
  }

}
