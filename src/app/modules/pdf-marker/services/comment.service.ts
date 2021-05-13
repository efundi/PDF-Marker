import { Injectable } from '@angular/core';
import {HttpClient, HttpEvent} from "@angular/common/http";
import {Observable} from "rxjs";
import { IComment } from '@coreModule/utils/comment.class';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  saveNewComment(formData: FormData) {
      throw new Error('Method not implemented.');
  }

  constructor(private http: HttpClient) { }

  getCommentDetails(): Observable<IComment[]> {
    return this.http.get<IComment[]>('/api/comment/details');
  }

  deleteComment(data: any): Observable<IComment[]> {
    return this.http.post<IComment[]>('/api/comment/delete', data);
  }

  deleteCommentCheck(data: any): Observable<boolean> {
    return this.http.post<boolean>('/api/comment/delete/check', data);
  }
}
