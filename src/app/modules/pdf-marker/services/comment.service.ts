import { Injectable } from '@angular/core';
import {HttpClient, HttpEvent} from "@angular/common/http";
import {Observable} from "rxjs";
import { IComment } from '@coreModule/utils/comment.class';
import {IRubric} from '@coreModule/utils/rubric.class';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  saveComments(data: FormData): Observable<IComment[]> {
    return this.http.post<IComment[]>('/api/comment/save', data);
  }

  constructor(private http: HttpClient) { }

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
