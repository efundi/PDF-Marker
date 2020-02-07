import {Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewContainerRef} from '@angular/core';
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {AppService} from "@coreModule/services/app.service";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {Router} from "@angular/router";
import {Subscription} from "rxjs";

@Component({
  selector: 'pdf-marker-assignment-marking-rubric',
  templateUrl: './assignment-marking-rubric.component.html',
  styleUrls: ['./assignment-marking-rubric.component.scss']
})
export class AssignmentMarkingRubricComponent implements OnInit, OnDestroy {

  // @ts-ignore
  @ViewChild('container') container: ElementRef;

  // @ts-ignore
  @ViewChild('pdfViewerAutoLoad') pdfViewerAutoLoad;

  @ViewChild('containerRef', {read: ViewContainerRef, static: false})
  actualContainer: ViewContainerRef;

  // @ts-ignore
  @ViewChild('markerContainer') markerContainer: ElementRef;

  currentPage: number = 1;
  assignmentSettings: AssignmentSettingsInfo;
  colour: string = "#6F327A";
  wheelDirection: string;
  isWheel: boolean;
  pdfPages: number = 0;
  isPdfLoaded: boolean;
  showSettings: boolean;
  show: boolean;
  pdfPath: string;
  readonly containsRubric: boolean = true;

  subscription: Subscription;

  constructor(private appService: AppService,
              private assignmentService: AssignmentService,
              private router: Router) { }

  ngOnInit() {
    if(this.assignmentService.getSelectedPdfURL() === undefined || this.assignmentService.getSelectedPdfURL() === null){
      this.router.navigate(["/marker"]);
    } else {
      this.getAssignmentProgress();
    }

    this.subscription = this.assignmentService.selectedPdfURLChanged().subscribe(pdfPath => {
      if (pdfPath && this.assignmentService.getAssignmentSettingsInfo().rubric !== null) {
        this.currentPage = 1;
        this.getAssignmentProgress(true);
      }
    });
  }

  private getAssignmentProgress(isSubscription: boolean = false) {
    this.isPdfLoaded = false;
    if(!!this.assignmentService.getAssignmentSettingsInfo()) {
      this.assignmentSettings = this.assignmentService.getAssignmentSettingsInfo();
      this.intializePage(isSubscription);
    } else {
      this.assignmentService.getAssignmentSettings().subscribe((settings: AssignmentSettingsInfo) => {
        this.assignmentSettings = settings;
        this.intializePage(isSubscription);
      }, error => {
        this.appService.isLoading$.next(false);
      });
    }
  }

  private intializePage(isSubscription: boolean) {
    if(this.assignmentSettings.defaultColour !== undefined && this.assignmentSettings.defaultColour !== null)
      this.colour = this.assignmentSettings.defaultColour;
    this.openPDF();
    if(isSubscription) {
      this.pdfViewerAutoLoad.pdfSrc = this.pdfPath; // pdfSrc can be Blob or Uint8Array
      this.pdfViewerAutoLoad.refresh();
    }
  }

  private openPDF() {
    this.pdfPath = this.assignmentService.getSelectedPdfURL();
  }

  pagesLoaded(pageNumber) {
    this.pdfPages = pageNumber;
    this.currentPage = 1;
    this.appService.initializeScrollPosition();

    const pdfViewerApplication = this.pdfViewerAutoLoad.PDFViewerApplication;

    console.log("Current page is " + this.currentPage);

    let maxHeight: number = 0;
    let maxWidth: number = 0;

    for(let i = this.currentPage; i <= this.pdfPages; i++) {
      console.log(i);
      maxHeight += parseInt(pdfViewerApplication.pdfViewer.viewer.children[i - 1].style.height.replace("px", ""));
      if(!maxWidth)
        maxWidth += parseInt(pdfViewerApplication.pdfViewer.viewer.children[i - 1].style.width.replace("px", ""));
    }

    console.log(maxHeight);

    this.container.nativeElement.style.height = (maxHeight / this.pdfPages) + "px";
    this.container.nativeElement.style.width = maxWidth + "px";
    this.markerContainer.nativeElement.style.height = (maxHeight / this.pdfPages) + "px";

    this.isPdfLoaded = this.show = true;
    this.appService.isLoading$.next(false);
  }

  onControl(control: string) {
    switch (control) {
      case 'clearAll' :   this.clearMarks();
        break;
      case 'settings' :   this.settings();
        break;
      case 'finalise' :   this.finalise();
        break;
      case 'prevPage' :   this.onPagedChanged(this.currentPage - 1);
        break;
      case 'nextPage' :   this.onPagedChanged(this.currentPage + 1);
        break;
      default         :   console.log("No control '" + control + "' found!");
        break;
    }
  }

  clearMarks() {

  }

  settings() {

  }

  finalise() {

  }

  onPaged(pageNumber: number) {
    if(this.currentPage !== pageNumber && !this.isWheel) {
      this.currentPage = pageNumber;
    }
    this.appService.initializeScrollPosition();
  }

  onPagedChanged(pageNumber: number, isWheel:boolean = false) {
    this.currentPage = pageNumber;
    if(isWheel)
      this.wheelDirection = undefined;
    this.isWheel = isWheel;
  }

  onPageNumberChange(pageNumber: number) {
    this.currentPage = pageNumber;
  }

  onMouseWheel(event) {
    event.stopImmediatePropagation();
    event.preventDefault();
    if(event.deltaY < 0 && this.currentPage !== 1 && this.wheelDirection !== "up") {
      this.wheelDirection = "up";
      this.onPagedChanged(this.currentPage - 1, true);
    } else if(event.deltaY > 0 && this.currentPage !== this.pdfPages && this.wheelDirection !== "down") {
      this.wheelDirection = "down";
      this.onPagedChanged(this.currentPage + 1,true);
    }
  }

  onColourChanged(colour: string) {
    this.colour = colour;
  }

  onColourPickerClose(colour: string) {
    if(this.colour !== this.assignmentSettings.defaultColour)
      this.onAssignmentSettings({defaultColour: colour, rubricID: this.assignmentSettings.rubricID, isCreated: this.assignmentSettings.isCreated});
  }

  onAssignmentSettings(settings: AssignmentSettingsInfo) {
    this.appService.isLoading$.next(true);
    this.assignmentService.assignmentSettings(settings).subscribe((assignmentSettings: AssignmentSettingsInfo) => {
      this.assignmentSettings = assignmentSettings;
      this.assignmentService.setAssignmentSettings(assignmentSettings);
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.isLoading$.next(false);
    });
  }

  isNullOrUndefined(object: any): boolean {
    return (object === null || object === undefined);
  }

  ngOnDestroy(): void {
    console.log(this.router.url);
    //this.assignmentService.setSelectedPdfBlob(undefined);
    //this.assignmentService.setAssignmentSettings(undefined);
    //this.assignmentService.setSelectedPdfURL("", "");
    this.subscription.unsubscribe();
  }

}
