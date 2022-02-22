import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {IComment} from '../../../../shared/info-objects/comment.class';
import {CommentServiceIpc} from '../../../../shared/ipc/comment-service-ipc';
import {fromIpcResponse} from '@sharedModule/services/ipc.utils';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private commentApi: CommentServiceIpc;

  constructor(private http: HttpClient) {
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
