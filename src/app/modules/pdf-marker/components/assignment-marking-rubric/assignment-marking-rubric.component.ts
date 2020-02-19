import {Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewContainerRef} from '@angular/core';
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {AppService} from "@coreModule/services/app.service";
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {Router} from "@angular/router";
import {Subscription} from "rxjs";
import {IRubric} from "@coreModule/utils/rubric.class";
import {MatDialogConfig} from "@angular/material/dialog";
import {YesAndNoConfirmationDialogComponent} from "@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component";
import {RoutesEnum} from "@coreModule/utils/routes.enum";

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
  marks: any[] = [];
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
      this.appService.isLoading$.next(true);
      this.assignmentService.getSavedMarks().subscribe((marks: any[]) => {
        this.appService.isLoading$.next(false);
        this.marks = marks;
        this.getAssignmentProgress();
        this.rubricContainerShow = false;
        this.pdfContainerShow = false;
        this.toggleBothContainers();
      }, error => {
        this.appService.isLoading$.next(false);
        this.appService.openSnackBar(false, "Unable to read marks");
        this.router.navigate([RoutesEnum.MARKER]);
      });
    }

    this.subscription = this.assignmentService.selectedPdfURLChanged().subscribe(pdfPath => {
      if (pdfPath && this.assignmentService.getAssignmentSettingsInfo().rubric !== null) {
        this.currentPage = 1;
        this.assignmentService.getSavedMarks().subscribe((marks: any[]) => {
          this.appService.isLoading$.next(false);
          this.marks = marks;
          this.getAssignmentProgress(true);
          this.rubricContainerShow = false;
          this.pdfContainerShow = false;
          this.toggleBothContainers();
        }, error => {
          this.appService.isLoading$.next(false);
          this.appService.openSnackBar(false, "Unable to read marks");
          this.router.navigate([RoutesEnum.MARKER]);
        });
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

    this.maxHeight = 0;
    this.maxWidth = 0;

    for (let i = this.currentPage; i <= this.pdfPages; i++) {
      this.maxHeight += parseInt(pdfViewerApplication.pdfViewer.viewer.children[i - 1].style.height.replace("px", ""));
      if (!this.maxWidth)
        this.maxWidth += parseInt(pdfViewerApplication.pdfViewer.viewer.children[i - 1].style.width.replace("px", ""));
    }

    this.pdfContainer.nativeElement.style.width = (this.maxWidth -5) + "px";
    this.rubricContainer.nativeElement.style.width = ( this.maxWidth -5) + "px";
    this.container.nativeElement.style.height = (this.maxHeight / this.pdfPages) + "px";
    this.container.nativeElement.style.width = this.maxWidth + "px";
    this.pdfContainer.nativeElement.style.height = (this.maxHeight / this.pdfPages) + "px";
    this.rubricContainer.nativeElement.style.height = (this.maxHeight / this.pdfPages) + "px";
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
      case 'showPDF' :
        this.toggleMarkingContainer();
        break;
      case 'showBoth' :
        this.toggleBothContainers();
        break;
      case 'showRubric' :
        this.toggleRubricContainer();
        break;
      default         :
        console.log("No control '" + control + "' found!");
        break;
    }
  }

  clearMarks() {
    let found: boolean = false;
    for(let i = 0; i < this.marks.length; i++) {
      if(this.marks[i] !== null) {
        found = true;
        break;
      }
    }

    if(found) {
      const title = "Confirm";
      const message = "Are you sure you want to delete all marks for this assignment?";
      this.openYesNoConfirmationDialog(title, message);
    }
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
    return;
  }

  onColourPickerClose(colour: string) {
    return;
  }

  onMarksUpdated(marks: any[] = []) {
    this.marks = marks;
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

  private openYesNoConfirmationDialog(title: string = "Confirm", message: string) {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "400px";
    config.data = {
      title: title,
      message: message,
    };

    const shouldDeleteFn = (shouldDelete: boolean) => {
      if(shouldDelete) {
        this.assignmentService.saveRubricMarks(this.assignmentSettings.rubric.name, [], 0).subscribe(() => {
          this.marks = [];
          this.appService.openSnackBar(true, "Saved");
          this.appService.isLoading$.next(false);
        }, error => {
          this.appService.openSnackBar(false, "Unable to save marks");
          this.appService.isLoading$.next(false);
        })
      }
    };
    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldDeleteFn);
  }
}
