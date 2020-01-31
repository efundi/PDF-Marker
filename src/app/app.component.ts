import {AfterViewChecked, ChangeDetectorRef, Component} from '@angular/core';
import {AppService} from "@coreModule/services/app.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewChecked {
  title = 'PDF Marker';

  isLoading$ = this.appService.isLoading$;

  constructor(private appService: AppService,
              private cdRef: ChangeDetectorRef) {}

  ngAfterViewChecked() {
    this.cdRef.detectChanges();
  }
}
