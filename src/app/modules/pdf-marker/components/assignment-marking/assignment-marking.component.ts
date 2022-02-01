import {
  Component,
  ComponentFactoryResolver,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  Renderer2,
  ViewChild,
  ViewChildren,
  ViewContainerRef
} from '@angular/core';
import {AssignmentService} from '@sharedModule/services/assignment.service';
import {mergeMap, Observable, of, Subscription, tap, throwError} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {AppService} from '@coreModule/services/app.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {AssignmentSettingsInfo} from '@pdfMarkerModule/info-objects/assignment-settings.info';
import {FinaliseMarkingComponent} from '@pdfMarkerModule/components/finalise-marking/finalise-marking.component';
import {getDocument, GlobalWorkerOptions, PDFDocumentProxy} from 'pdfjs-dist';
import {cloneDeep, isNil, times} from 'lodash-es';
import {MarkInfo} from '@sharedModule/info-objects/mark.info';
import {catchError, map} from 'rxjs/operators';
import {
  YesAndNoConfirmationDialogComponent
} from '@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {
  AssignmentMarkingSessionService
} from '@pdfMarkerModule/components/assignment-marking/assignment-marking-session.service';
import {IRubric} from '@coreModule/utils/rubric.class';

GlobalWorkerOptions.workerSrc = 'pdf.worker.js';


@Component({
  selector: 'pdf-marker-assignment-marking',
  templateUrl: './assignment-marking.component.html',
  styleUrls: ['./assignment-marking.component.scss'],
  providers: [{
    // Provide an instance scoped to this assignment marking editor
    provide: AssignmentMarkingSessionService,
    useClass: AssignmentMarkingSessionService
  }]
})
export class AssignmentMarkingComponent implements OnInit, OnDestroy {

  constructor(private renderer: Renderer2,
              private assignmentService: AssignmentService,
              private el: ElementRef,
              private dialog: MatDialog,
              private resolver: ComponentFactoryResolver,
              private route: ActivatedRoute,
              private router: Router,
              private appService: AppService,
              private assignmentMarkingSessionService: AssignmentMarkingSessionService) { }

  @ViewChild('container', {static: true})
  private container: ElementRef;

  @ViewChild('markerContainer', {static: true})
  private markerContainer: ElementRef;

  @ViewChild('containerRef', {read: ViewContainerRef, static: false})
  actualContainer: ViewContainerRef;

  pdfDocument: PDFDocumentProxy;

  pdfPath: string;
  isPdfLoaded: boolean;
  currentPage = 1;
  assignmentSettings: AssignmentSettingsInfo;
  totalMark = 0;
  private selectedPdfSubscription: Subscription;
  private colorChangeSubscription: Subscription;
  marks: MarkInfo[][] | any[];
  readonly defaultFullMark = 1;
  readonly defaultIncorrectMark = 0;
  rubric: IRubric;
  showRubric = false;
  showPdf = true;


  /**
   * Reference to the assignment marking pages
   * Keep in mind that this changes dynamically, referencing it too soon in the Angular lifecycle
   * will cause errors
   */
  @ViewChildren('pdfPage', {read: ElementRef})
  pdfPages: QueryList<ElementRef>;

  pageObjects = [];

  repeatPerPage(): [] | Array<any> {
    if (isNil(this.pdfDocument)) {
      return [];
    } else {
      return new Array(this.pdfDocument.numPages);
    }
  }

  private loadAssignment(pdfPath: string) {
    this.currentPage = 1;
    this.loadPdf(pdfPath).then(() => {
      this.getAssignmentProgress();
    });
  }

  ngOnInit() {
    if (isNil(this.assignmentService.getSelectedPdfURL())) {
      this.router.navigate(['/marker']);
    } else {
      this.loadAssignment(this.assignmentService.getSelectedPdfURL());
    }

    this.selectedPdfSubscription = this.assignmentService.selectedPdfURLChanged().subscribe(pdfPath => {
      this.loadAssignment(pdfPath);
    });

    this.colorChangeSubscription = this.assignmentMarkingSessionService.colourChanged.subscribe((colour) => {
      this.onColourChanged(colour);
    });
  }


  private loadPdf(path: string): Promise<PDFDocumentProxy> {
    return getDocument(path).promise.then((pdf) => {
      this.pdfDocument = pdf;
      return pdf;
    });
  }

  /**
   * Make sure the array of marks has marks for each page
   * @private
   */
  private setupMark(marks: MarkInfo[][] | any[]): MarkInfo[][] {

    if (isNil(this.assignmentSettings.rubric)) {
      const numPages = this.pdfDocument.numPages;
      if (marks.length < numPages) {
        marks.length = numPages;
      }

      times(numPages, (index) => {
        if (isNil(marks[index])) {
          marks[index] = [];
        }
      });
    }

    return marks;
  }

  private loadAssignmentSettings(): Observable<AssignmentSettingsInfo> {
    let observable: Observable<AssignmentSettingsInfo>;
    if (!!this.assignmentService.getAssignmentSettingsInfo()) {
      observable = of(this.assignmentService.getAssignmentSettingsInfo());
    } else {
      observable = this.assignmentService.getAssignmentSettings();
    }

    return observable.pipe(
      tap((assignmentSettings) => {
        this.assignmentSettings = assignmentSettings;
        if (this.assignmentSettings.rubric) {
          this.rubric = this.assignmentSettings.rubric;
          this.showRubric = true;
        }
        this.assignmentMarkingSessionService.colour = this.assignmentSettings.defaultColour;
      })
    );
  }

  private loadMarks(): Observable<any> {
    return this.assignmentService.getSavedMarks()
      .pipe(
        tap((marks) => {
          this.marks = this.setupMark(marks);
        })
      );
  }

  private getAssignmentProgress() {
    this.isPdfLoaded = false;
    this.appService.isLoading$.next(true);

    this.loadAssignmentSettings()
      .pipe(
        mergeMap(() => this.loadMarks())
      )
      .subscribe({
        next: (settings: AssignmentSettingsInfo) => {
          this.appService.initializeScrollPosition();
          this.isPdfLoaded = true;
        },
        error: (error) => {
          console.log(error);
        },
        complete: () => {
          this.appService.isLoading$.next(false);
        }
      });
  }

  private onColourChanged(colour: string) {
    this.onAssignmentSettings({
      ...this.assignmentSettings,
      defaultColour: colour,
      rubricID: this.assignmentSettings.rubricID,
      isCreated: this.assignmentSettings.isCreated
    });
  }

  onPagedChanged(pageNumber: number) {
    this.currentPage = pageNumber;
    const element = this.pdfPages.get(pageNumber - 1).nativeElement;
    element.scrollIntoView({behavior: 'smooth', block: 'start', inline: 'start'});
  }

  onControl(control: string) {
    switch (control) {
      case 'save'     :   this.saveMarks().subscribe();
        break;
      case 'clearAll' :   this.clearMarks();
        break;
      case 'finalise' :   this.finalise();
        break;
      case 'prevPage' :   this.onPagedChanged(this.currentPage - 1);
        break;
      case 'nextPage' :   this.onPagedChanged(this.currentPage + 1);
        break;
      case 'showPDF' :
        this.showRubric = false;
        this.showPdf = true;
        break;
      case 'showBoth' :
        this.showRubric = true;
        this.showPdf = true;
        break;
      case 'showRubric' :
        this.showRubric = true;
        this.showPdf = false;
        break;
      default         :   console.log('No control \'' + control + '\' found!');
        break;
    }
  }

  onAssignmentSettings(settings: AssignmentSettingsInfo) {
    this.appService.isLoading$.next(true);
    this.assignmentService.assignmentSettings(settings).subscribe({
      next: (assignmentSettings: AssignmentSettingsInfo) => {
        this.assignmentSettings = assignmentSettings;
        this.assignmentService.setAssignmentSettings(assignmentSettings);
        this.appService.isLoading$.next(false);
      },
      error: (error) => {
        this.appService.isLoading$.next(false);
      }}
    );
  }


  /**
   * Save the marks for the specified page index
   * @param pageIndex
   * @param marks
   */
  savePageMarks(pageIndex: number, marks: MarkInfo[]): Observable<any> {
    const marksToSave = cloneDeep(this.marks);
    marksToSave[pageIndex] = marks;
    return this.saveMarks(marksToSave);
  }

  /**
   * Saves the marks and returns an observable if the save succeeded
   */
  saveMarks(marks: MarkInfo[][] = null): Observable<any> {
    const originalMarks = cloneDeep(this.marks);
    const markDetails = marks || this.marks;
    this.appService.isLoading$.next(true);
    return this.assignmentService.saveMarks(markDetails, this.totalMark)
      .pipe(
        map(() => {
          this.appService.isLoading$.next(false);
          this.marks = this.setupMark(markDetails);
          this.appService.openSnackBar(true, 'Saved');
        })
      )
      .pipe(
        catchError((error) => {
          this.appService.isLoading$.next(false);
          this.marks = originalMarks;
          this.appService.openSnackBar(false, 'Unable to save');
          return throwError(error);
        })
      );
  }

  /**
   * Clear all marks
   */
  clearMarks() {
    if (this.marks.length > 0) {
      const title = 'Confirm';
      const message = 'Are you sure you want to delete all marks and comments for this assignment?';
      this.openYesNoConfirmationDialog(title, message);
    }
  }

  private openYesNoConfirmationDialog(title: string = 'Confirm', message: string) {
    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '400px';
    config.data = {
      title: title,
      message: message,
    };

    const shouldDeleteFn = (shouldDelete: boolean) => {
      if (shouldDelete) {
        this.saveMarks([])
          .subscribe({
            next: () => {
              this.appService.openSnackBar(true, 'Successfully cleared marks!');
            },
            error: () => {
              this.appService.openSnackBar(false, 'Could not clear marks!');
            }
          });
      }
    };
    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldDeleteFn);
  }


  private finalise() {
    const config: MatDialogConfig = new MatDialogConfig();
    config.width = '400px';
    config.height = '500px';
    config.disableClose = true;

    config.data = {
      assignmentPath: this.assignmentService.getSelectedPdfLocation(),
      marks: this.marks,
      defaultTick: this.defaultFullMark,
      incorrectTick: this.defaultIncorrectMark
    };
    this.appService.createDialog(FinaliseMarkingComponent, config);
  }

  openNewMarkingCommentModal(title: string = 'Marking Comment', message: string) {
    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '500px';
    config.disableClose = true;
    config.data = {
      title: title,
      message: message,
    };

    return config;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    event.preventDefault();
  }

  ngOnDestroy(): void {
    this.selectedPdfSubscription.unsubscribe();
    this.colorChangeSubscription.unsubscribe();
  }

  onSectionChange($event: string) {
    let pageIndex = +$event;
    if (isNaN(pageIndex)) {
      pageIndex = 0;
    }
    this.currentPage = pageIndex + 1;
  }


  toggleMarkingContainer() {
    // this.pdfContainerShow = true;
    // this.rubricContainerShow = false;
    // this.rubricContainer.nativeElement.style.display = 'none';
    // this.pdfContainer.nativeElement.style.margin = 'auto';
    // this.pdfContainer.nativeElement.styleheight = (this.maxHeight / this.pdfPages) + 'px';
    // this.pdfContainer.nativeElement.stylewidth =  '816px';
    // this.pdfContainer.nativeElement.style.display = 'block';
  }

  toggleRubricContainer() {
    // this.rubricContainerShow = true;
    // this.pdfContainerShow = false;
    // this.pdfContainer.nativeElement.style.display = 'none';
    // this.rubricContainer.nativeElement.style.margin = 'auto';
    // this.rubricContainer.nativeElement.styleheight = (this.maxHeight / this.pdfPages) + 'px';
    // this.rubricContainer.nativeElement.stylewidth =  '816px';
    // this.rubricContainer.nativeElement.style.display = 'block';

  }

  toggleBothContainers() {
    // this.pdfContainerShow = true;
    // this.rubricContainerShow = true;
    // this.pdfContainer.nativeElement.style.display = 'block';
    // this.rubricContainer.nativeElement.style.display = 'block';
    // this.pdfContainer.nativeElement.style.margin = 'none';
    // this.rubricContainer.nativeElement.style.margin = 'none';
    // this.rubricContainer.nativeElement.styleheight = ((this.maxHeight / this.pdfPages) / 2) - 5 + 'px';
    // this.pdfContainer.nativeElement.styleheight =  ((this.maxHeight / this.pdfPages) / 2) - 5 + 'px';
  }

  onMarksUpdated($event: any[]) {

  }
}
