import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {IComment} from '@shared/info-objects/comment.class';
import {CommentIpcService} from '@shared/ipc/comment.ipc-service';
import {fromIpcResponse} from './ipc.utils';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private commentApi: CommentIpcService;

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
