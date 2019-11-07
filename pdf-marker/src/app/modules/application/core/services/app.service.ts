import {Injectable} from '@angular/core';
import {Subject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AppService {

  isLoading$: Subject<boolean> = new Subject<boolean>();

  private containerElement: any;

  public readonly client_id: string = "PDF_MARKER";

  constructor() { }

  initializeScrollPosition() {
    this.containerElement.elementRef.nativeElement.scrollTop = 0;
  }

  setContainerElement(element: any) {
    this.containerElement = element;
  }
}
