import {Injectable, Injector} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {Observable, throwError} from "rxjs";
import {AlertService} from "@coreModule/services/alert.service";
import {catchError} from "rxjs/operators";
import {ValidationErrorInfo} from "@sharedModule/info-objects/validation-error.info";

@Injectable()
export class PdfMarkerErrorInterceptorService implements HttpInterceptor {

  constructor(private injector: Injector) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const alert = this.injector.get(AlertService);
    return next.handle(req).pipe(
      catchError((response: any) => {
        if(response.error.errors !== undefined) {
          response.error.errors.forEach(error => {
            alert.error(error.msg);
          })
        } else if(response.error !== undefined) {
          alert.error(response.error.message);
        }
        return throwError(response);
      })
    )
  }


}
