import {Injectable} from '@angular/core';
import {Subject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AppService {

  isLoading$: Subject<boolean> = new Subject<boolean>();
  constructor() { }
}
