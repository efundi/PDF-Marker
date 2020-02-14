import {Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewContainerRef} from '@angular/core';
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {AppService} from "@coreModule/services/app.service";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {Router} from "@angular/router";
import {Subscription} from "rxjs";
import {IRubric} from "@coreModule/utils/rubric.class";

@Component({
  selector: 'pdf-marker-assignment-marking-rubric',
  templateUrl: './assignment-marking-rubric.component.html',
  styleUrls: ['./assignment-marking-rubric.component.scss']
})
export class AssignmentMarkingRubricComponent implements OnInit, OnDestroy {

  // @ts-ignore
  @ViewChild('container') container: ElementRef;

  // @ts-ignore
  @ViewChild('rubricContainer') rubricContainer: ElementRef;

  // @ts-ignore
  @ViewChild('pdfContainer') pdfContainer: ElementRef;

  // @ts-ignore
  @ViewChild('pdfViewerAutoLoad') pdfViewerAutoLoad;

  @ViewChild('containerRef', {read: ViewContainerRef, static: false})
  actualContainer: ViewContainerRef;

  // @ts-ignore
  @ViewChild('markerContainer') markerContainer: ElementRef;

  // @ts-ignore
  @ViewChild('displayContainer') displayContainer: ElementRef;

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
  containsRubric: boolean = true;

  subscription: Subscription;
  rubricContainerShow: boolean;
  pdfContainerShow: boolean;
  rubric: IRubric;

  maxHeight: number;
  maxWidth: number;

  constructor(private appService: AppService,
              private assignmentService: AssignmentService,
              private router: Router) {
  }


  ngOnInit() {
    if (this.assignmentService.getSelectedPdfURL() === undefined || this.assignmentService.getSelectedPdfURL() === null) {
      this.router.navigate(["/marker"]);
    } else {
      this.getAssignmentProgress();
      this.rubricContainerShow = false;
      this.pdfContainerShow = false;
      this.toggleBothContainers();
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
    if (!!this.assignmentService.getAssignmentSettingsInfo()) {
      this.assignmentSettings = this.assignmentService.getAssignmentSettingsInfo();
      if (this.assignmentSettings.rubric)
        this.rubric = this.assignmentSettings.rubric;
      this.intializePage(isSubscription);
    } else {
      this.assignmentService.getAssignmentSettings().subscribe((settings: AssignmentSettingsInfo) => {
        this.assignmentSettings = settings;
        if (this.assignmentSettings.rubric)
          this.rubric = settings.rubric;
        this.intializePage(isSubscription);
      }, error => {
        this.appService.isLoading$.next(false);
      });
    }
  }

  private intializePage(isSubscription: boolean) {
    if (this.assignmentSettings.defaultColour !== undefined && this.assignmentSettings.defaultColour !== null)
      this.colour = this.assignmentSettings.defaultColour;
    this.openPDF();
    if (isSubscription) {
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

    this.maxHeight = 0;
    this.maxWidth = 0;

    for (let i = this.currentPage; i <= this.pdfPages; i++) {
      console.log(i);
      this.maxHeight += parseInt(pdfViewerApplication.pdfViewer.viewer.children[i - 1].style.height.replace("px", ""));
      if (!this.maxWidth)
        this.maxWidth += parseInt(pdfViewerApplication.pdfViewer.viewer.children[i - 1].style.width.replace("px", ""));
    }

    console.log("Max Height:" + this.maxHeight);
    console.log("Max Width:" + this.maxWidth);

    this.pdfContainer.nativeElement.style.width = (this.maxWidth -5) + "px";
    this.rubricContainer.nativeElement.style.width = ( this.maxWidth -5) + "px";
    this.container.nativeElement.style.height = (this.maxHeight / this.pdfPages) + "px";
    this.pdfContainer.nativeElement.style.height = (this.maxHeight / this.pdfPages) + "px";
    this.rubricContainer.nativeElement.style.height = (this.maxHeight / this.pdfPages) + "px";
    this.container.nativeElement.style.width = (this.maxWidth) + "px";
    this.displayContainer.nativeElement.style.width = (this.maxWidth*2)+"px";
    this.isPdfLoaded = this.show = true;
    this.appService.isLoading$.next(false);
  }

  onControl(control: string) {
    switch (control) {
      case 'clearAll' :
        this.clearMarks();
        break;
      case 'settings' :
        this.settings();
        break;
      case 'finalise' :
        this.finalise();
        break;
      case 'prevPage' :
        this.onPagedChanged(this.currentPage - 1);
        break;
      case 'nextPage' :
        this.onPagedChanged(this.currentPage + 1);
        break;
      default         :
        console.log("No control '" + control + "' found!");
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
    if (this.currentPage !== pageNumber && !this.isWheel) {
      this.currentPage = pageNumber;
    }
    this.appService.initializeScrollPosition();
  }

  onPagedChanged(pageNumber: number, isWheel: boolean = false) {
    this.currentPage = pageNumber;
    if (isWheel)
      this.wheelDirection = undefined;
    this.isWheel = isWheel;
  }

  onPageNumberChange(pageNumber: number) {
    this.currentPage = pageNumber;
  }

  onMouseWheel(event) {
    event.stopImmediatePropagation();
    event.preventDefault();
    if (event.deltaY < 0 && this.currentPage !== 1 && this.wheelDirection !== "up") {
      this.wheelDirection = "up";
      this.onPagedChanged(this.currentPage - 1, true);
    } else if (event.deltaY > 0 && this.currentPage !== this.pdfPages && this.wheelDirection !== "down") {
      this.wheelDirection = "down";
      this.onPagedChanged(this.currentPage + 1, true);
    }
  }

  onColourChanged(colour: string) {
    this.colour = colour;
  }

  onColourPickerClose(colour: string) {
    if (this.colour !== this.assignmentSettings.defaultColour)
      this.onAssignmentSettings({
        defaultColour: colour,
        rubricID: this.assignmentSettings.rubricID,
        rubric: this.assignmentSettings.rubric,
        isCreated: this.assignmentSettings.isCreated
      });
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

  toggleMarkingContainer() {
      this.pdfContainerShow = true;
      this.rubricContainerShow = false;
      this.rubricContainer.nativeElement.style.display = "none";
       this.pdfContainer.nativeElement.style.margin = "auto";
      this.pdfContainer.nativeElement.styleheight = (this.maxHeight / this.pdfPages) +'px';
      this.pdfContainer.nativeElement.stylewidth =  '816px';
      this.pdfContainer.nativeElement.style.display = "block";
    }

  toggleRubricContainer() {
      this.rubricContainerShow = true;
      this.pdfContainerShow = false;
      this.pdfContainer.nativeElement.style.display = "none";
      this.rubricContainer.nativeElement.style.margin = "auto";
      this.rubricContainer.nativeElement.styleheight = (this.maxHeight / this.pdfPages) +'px';
      this.rubricContainer.nativeElement.stylewidth =  '816px';
      this.rubricContainer.nativeElement.style.display = "block";

  }

  toggleBothContainers() {
    this.pdfContainerShow = true;
    this.rubricContainerShow = true;
    this.pdfContainer.nativeElement.style.display = "block";
    this.rubricContainer.nativeElement.style.display = "block";
    this.pdfContainer.nativeElement.style.margin = "none";
    this.rubricContainer.nativeElement.style.margin = "none";
    this.rubricContainer.nativeElement.styleheight = ((this.maxHeight / this.pdfPages)/2)-5 +'px';
    this.pdfContainer.nativeElement.styleheight =  ((this.maxHeight / this.pdfPages)/2)-5 +'px';

  }


}
