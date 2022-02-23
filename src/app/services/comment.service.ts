import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {IComment} from '@shared/info-objects/comment.class';
import {CommentServiceIpc} from '@shared/ipc/comment-service-ipc';
import {fromIpcResponse} from './ipc.utils';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private commentApi: CommentServiceIpc;

  constructor() {
    this.commentApi = (window as any).commentApi;
  }

  addComment(commentText: string): Observable<IComment[]> {
    return fromIpcResponse(this.commentApi.addComment(commentText));
  }

  getCommentDetails(): Observable<IComment[]> {
    return fromIpcResponse(this.commentApi.getComments());
  }

  deleteComment(commentId: string): Observable<IComment[]> {
    return fromIpcResponse(this.commentApi.deleteComment(commentId));
  }

}
