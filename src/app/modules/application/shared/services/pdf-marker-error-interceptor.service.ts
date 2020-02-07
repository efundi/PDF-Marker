import {Injectable, Injector} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {Observable, throwError} from "rxjs";
import {AlertService} from "@coreModule/services/alert.service";
import {catchError} from "rxjs/operators";
import {AppService} from "@coreModule/services/app.service";

@Injectable()
export class PdfMarkerErrorInterceptorService implements HttpInterceptor {

  constructor(private injector: Injector) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const alert = this.injector.get(AlertService);
    const appService = this.injector.get(AppService);

    const request = req.clone({
      setHeaders: {
        client_id: appService.client_id
      },
      // This is needed for electron.
      url: (req.url.startsWith("/api")) ? "http://localhost:4200" + req.url:req.url
    });
    return next.handle(request).pipe(
      catchError((response: any) => {
        if(response.error && response.error.errors !== undefined) {
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
