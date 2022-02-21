import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {IComment} from '../../../../shared/info-objects/comment.class';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  constructor(private http: HttpClient) { }

  saveComments(data: FormData): Observable<IComment[]> {
    return this.http.post<IComment[]>('/api/comment/save', data);
  }

  getCommentDetails(): Observable<IComment[]> {
    return this.http.get<IComment[]>('/api/comment/list');
  }

  deleteComment(data: any): Observable<IComment[]> {
    return this.http.post<IComment[]>('/api/comment/delete', data);
  }

  deleteCommentCheck(data: any): Observable<boolean> {
    return this.http.post<boolean>('/api/comment/delete/check', data);
  }
}
