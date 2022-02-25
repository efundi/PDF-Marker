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
import {AssignmentService} from '../../services/assignment.service';
import {from, mergeMap, Observable, of, Subscription, tap, throwError} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {AppService} from '../../services/app.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {FinaliseMarkingComponent} from '../finalise-marking/finalise-marking.component';
import {getDocument, GlobalWorkerOptions, PDFDocumentProxy} from 'pdfjs-dist';
import {cloneDeep, isNil, times} from 'lodash';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {catchError, map} from 'rxjs/operators';
import {
  YesAndNoConfirmationDialogComponent
} from '../yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {AssignmentMarkingSessionService, ZoomChangeEvent} from './assignment-marking-session.service';
import {AssignmentMarkingPageComponent} from '../assignment-marking-page/assignment-marking-page.component';
import {IRubric} from '@shared/info-objects/rubric.class';
import {PdfmUtilsService} from "../../services/pdfm-utils.service";


GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';


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
              private activatedRoute: ActivatedRoute,
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
  private paramsSubscription: Subscription;
  private colorChangeSubscription: Subscription;
  private zoomChangeSubscription: Subscription;
  marks: MarkInfo[][] | any[];
  readonly defaultFullMark = 1;
  readonly defaultIncorrectMark = 0;
  rubric: IRubric;
  showRubric = false;
  showPdf = true;

  private workspaceName: string;
  private assignmentName: string;
  private student: string;
  private pdf: string;


  /**
   * Reference to the assignment marking pages
   * Keep in mind that this changes dynamically, referencing it too soon in the Angular lifecycle
   * will cause errors
   */
  @ViewChildren('pdfPage', {read: AssignmentMarkingPageComponent})
  pdfPages: QueryList<AssignmentMarkingPageComponent>;

  pageObjects = [];

  repeatPerPage(): [] | Array<any> {
    if (isNil(this.pdfDocument)) {
      return [];
    } else {
      return new Array(this.pdfDocument.numPages);
    }
  }

  private loadAssignment() {
    this.currentPage = 1;
    this.appService.isLoading$.next(true);
    // TODO fix location
    this.assignmentService.getFile(this.pdf)
      .pipe(
        mergeMap((data) => this.loadPdf(data)),
        mergeMap(() => this.loadAssignmentSettings()),
        mergeMap(() => this.loadMarks())
      ).subscribe({
      next: (settings: AssignmentSettingsInfo) => {
        this.appService.initializeScrollPosition();
      },
      error: (error) => {
        console.log(error);
      },
      complete: () => {
        this.isPdfLoaded = true;
        this.appService.isLoading$.next(false);
      }
    });
  }

  ngOnInit() {
    this.paramsSubscription = this.activatedRoute.params.subscribe((params) => {
      this.workspaceName = params['workspaceName'];
      this.assignmentName = params['assignmentName'];
      this.student = params['student'];
      this.pdf = params['pdf'];
      this.loadAssignment();
    });

    this.colorChangeSubscription = this.assignmentMarkingSessionService.colourChanged.subscribe((colour) => {
      this.onColourChanged(colour);
    });

    this.zoomChangeSubscription = this.assignmentMarkingSessionService.zoomChanged.subscribe((zoomChangeEvent) => {
      this.zoomChanged(zoomChangeEvent);
    });
  }


  private loadPdf(data: Uint8Array): Observable<PDFDocumentProxy> {
    const promise = getDocument(data).promise.then((pdf) => {
      this.pdfDocument = pdf;
      return pdf;
    });

    return from(promise);
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
    return this.assignmentService.getAssignmentSettings(this.workspaceName, this.assignmentName).pipe(
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
    return this.assignmentService.getSavedMarks(this.workspaceName, this.assignmentName)
      .pipe(
        tap((marks) => {
          this.marks = this.setupMark(marks);
        })
      );
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
    this.pdfPages.get(pageNumber - 1).scrollIntoView();
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
    this.assignmentService.updateAssignmentSettings(settings, this.workspaceName, this.assignmentName).subscribe({
      next: (assignmentSettings: AssignmentSettingsInfo) => {
        this.assignmentSettings = assignmentSettings;
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
    return this.assignmentService.saveMarks(PdfmUtilsService.dirname(this.pdf), markDetails, this.totalMark)
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

  saveRubricMarks(marks: any[]): Observable<any> {
    const originalMarks = cloneDeep(this.marks);
    const markDetails = marks || this.marks;
    this.appService.isLoading$.next(true);
    return this.assignmentService.saveRubricMarks(PdfmUtilsService.dirname(this.pdf), this.rubric.name, markDetails)
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
      assignmentPath: this.pdf,
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
    this.paramsSubscription.unsubscribe();
    this.colorChangeSubscription.unsubscribe();

    if (this.pdfDocument) {
      this.pdfDocument.cleanup();
    }
  }

  onSectionChange($event: string) {
    let pageIndex = +$event;
    if (isNaN(pageIndex)) {
      pageIndex = 0;
    }
    this.currentPage = pageIndex + 1;
  }

  private zoomChanged(zoomChangeEvent: ZoomChangeEvent) {

    const element = document.querySelector('.pages-wrapper');
    const previousScrollY = element.scrollTop;
    const viewWidth = element.clientWidth;

    // Percentage on which the scrollbar must be adjusted
    let scrollPer = 0.5; // By default center zoom
    if (element.scrollWidth - viewWidth > 0) {
      scrollPer = element.scrollLeft / (element.scrollWidth - viewWidth);
    }

    this.pdfPages.forEach((page) => {
      page.resizePage();
    });

    // When the zoom changes we have to adjust the scroll position
    // Offset to add to each page (paddings/margins/borders)
    const PAGE_Y_OFFSET = 19 * this.currentPage;

    const previousZoom = zoomChangeEvent.previous;
    const currentZoom = zoomChangeEvent.current;

    const scrollTop = ((previousScrollY - PAGE_Y_OFFSET) / previousZoom) * currentZoom;
    const scrollLeft = scrollPer * (element.scrollWidth - viewWidth);

    // Scroll to correct place
    element.scrollTo(scrollLeft, scrollTop + PAGE_Y_OFFSET);
  }
}
