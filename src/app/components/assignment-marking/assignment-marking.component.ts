import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  Renderer2,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {AssignmentService} from '../../services/assignment.service';
import {filter, from, mergeMap, Observable, Subscription, tap, throwError} from 'rxjs';
import {ActivatedRoute, NavigationStart, Router} from '@angular/router';
import {AppService} from '../../services/app.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {AssignmentSettingsInfo} from '@shared/info-objects/assignment-settings.info';
import {getDocument, GlobalWorkerOptions, PDFDocumentProxy} from 'pdfjs-dist';
import {cloneDeep, find, isNil, times} from 'lodash';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {catchError, map} from 'rxjs/operators';
import {
  ConfirmationDialogComponent
} from '../confirmation-dialog/confirmation-dialog.component';
import {AssignmentMarkingSessionService, ZoomChangeEvent} from './assignment-marking-session.service';
import {AssignmentMarkingPageComponent} from './assignment-marking-page/assignment-marking-page.component';
import {IRubric} from '@shared/info-objects/rubric.class';
import {PdfmUtilsService} from '../../services/pdfm-utils.service';
import {BusyService} from '../../services/busy.service';
import {
  MarkingSubmissionInfo,
  PageSettings,
  SubmissionInfo,
  SubmissionType
} from '@shared/info-objects/submission.info';
import {RoutesEnum} from '../../utils/routes.enum';
import {SettingsService} from '../../services/settings.service';
import {SettingInfo} from '@shared/info-objects/setting.info';
import {calculateCanEditMarking} from '../../utils/utils';


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
  private settings: SettingInfo;

  constructor(private renderer: Renderer2,
              private assignmentService: AssignmentService,
              private busyService: BusyService,
              private settingsService: SettingsService,
              private el: ElementRef,
              private dialog: MatDialog,
              private activatedRoute: ActivatedRoute,
              private router: Router,
              private appService: AppService,
              private assignmentMarkingSessionService: AssignmentMarkingSessionService) { }

  @ViewChild('pagesWrapper', {static: false})
  private pagesWrapper: ElementRef;

  pdfDocument: PDFDocumentProxy;

  isPdfLoaded: boolean;
  currentPage = 1;
  assignmentSettings: AssignmentSettingsInfo;
  private paramsSubscription: Subscription;
  private colorChangeSubscription: Subscription;
  private zoomChangeSubscription: Subscription;
  private routeSubscription: Subscription;
  submissionInfo: SubmissionInfo;

  rubric: IRubric;
  showRubric = false;
  showPdf = true;
  editEnabled = true;

  private workspaceName: string;
  private assignmentName: string;
  private pdf: string;


  /**
   * Reference to the assignment marking pages
   * Keep in mind that this changes dynamically, referencing it too soon in the Angular lifecycle
   * will cause errors
   */
  @ViewChildren('pdfPage', {read: AssignmentMarkingPageComponent})
  pdfPages: QueryList<AssignmentMarkingPageComponent>;

  repeatPerPage(): [] | Array<any> {
    if (isNil(this.pdfDocument)) {
      return [];
    } else {
      return new Array(this.pdfDocument.numPages);
    }
  }

  private loadAssignment() {
    this.isPdfLoaded = false;
    this.rubric = null;
    this.showRubric = false;
    this.showPdf = true;
    this.currentPage = 1;
    this.busyService.start();
    this.assignmentService.getFile(this.pdf)
      .pipe(
        mergeMap((data) => this.loadPdf(data)),
        mergeMap(() => this.loadAssignmentSettings()),
        mergeMap(() => this.loadMarks())
      ).subscribe({
      next: () => {
        this.appService.initializeScrollPosition();
        this.isPdfLoaded = true;

        const submissionDirectory = PdfmUtilsService.basename(PdfmUtilsService.dirname(this.pdf, 2));
        const submission = find(this.assignmentSettings.submissions, {directoryName: submissionDirectory});

        this.editEnabled = calculateCanEditMarking(this.assignmentSettings, this.settings.user, submission);

        this.busyService.stop();
      },
      error: (error) => {
        console.log(error);
        this.isPdfLoaded = false;
        this.busyService.stop();
        this.router.navigate(['/marker']);
      }
    });
  }

  ngOnInit() {
    this.loadSettings().subscribe(() => {
      this.paramsSubscription = this.activatedRoute.params.subscribe((params) => {
        this.assignmentMarkingSessionService.reset();
        this.workspaceName = params['workspaceName'];
        this.assignmentName = params['assignmentName'];
        this.pdf = params['pdf'];
        this.loadAssignment();
      });
    });


    this.colorChangeSubscription = this.assignmentMarkingSessionService.colourChanged.subscribe((colour) => {
      this.onColourChanged(colour);
    });

    this.zoomChangeSubscription = this.assignmentMarkingSessionService.zoomChanged.subscribe((zoomChangeEvent) => {
      this.zoomChanged(zoomChangeEvent);
    });

    this.routeSubscription = this.router.events.pipe(
      filter(e => e instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      if (!(event.url.startsWith(RoutesEnum.ASSIGNMENT_MARKER) || event.url.startsWith(RoutesEnum.PDF_VIEWER))) {
        this.assignmentService.selectSubmission(null);
      }
    });
  }


  private loadSettings(): Observable<SettingInfo> {
    return this.settingsService.getConfigurations()
      .pipe(
        tap((settings) => this.settings = settings)
      );
  }

  private loadPdf(data: Uint8Array): Observable<PDFDocumentProxy> {
    let promise: Promise<any> = Promise.resolve();
    if (this.pdfDocument) {
      promise = this.pdfDocument.cleanup()
        .then(() => this.pdfDocument.destroy());
    }

    promise = promise.then(() => getDocument(data).promise)
      .then((pdf) => {
        this.pdfDocument = pdf;
        return pdf;
      });

    return from(promise);
  }

  /**
   * Make sure the array of marks has marks for each page
   * @private
   */
  private setupMark(submissionInfo: SubmissionInfo): SubmissionInfo {
    const numPages = this.pdfDocument.numPages;
    times(numPages, (index) => {
      if (isNil(submissionInfo.pageSettings[index])) {
        submissionInfo.pageSettings[index] = {
          rotation: null // The page will set the default rotation from the PDF itself
        };
      }
    });

    if (isNil(submissionInfo.type)) {
      if (isNil(this.assignmentSettings.rubric)) {
        submissionInfo.type = SubmissionType.MARK;
      } else {
        submissionInfo.type = SubmissionType.RUBRIC;
      }
    }

    if (isNil(this.assignmentSettings.rubric)) {

      if (submissionInfo.marks.length < numPages) {
        submissionInfo.marks.length = numPages;
      }

      times(numPages, (index) => {
        if (isNil(submissionInfo.marks[index])) {
          submissionInfo.marks[index] = [];
        }
      });
    } else {
      const numCriterias = this.assignmentSettings.rubric.criterias.length;
      times(numCriterias, (index) => {
        if (isNil(submissionInfo.marks[index])) {
          submissionInfo.marks[index] = null;
        }
      });
    }

    return submissionInfo;
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

  private loadMarks(): Observable<SubmissionInfo> {
    // TODO ideally SubmissionInfo should contain the studentId...
    const studentDirectoryName = PdfmUtilsService.basename(PdfmUtilsService.dirname(this.pdf, 2));
    const submission = find(this.assignmentSettings.submissions, s => s.directoryName === studentDirectoryName);
    return this.assignmentService.getSavedMarks(this.workspaceName, this.assignmentName, submission.studentId)
      .pipe(
        tap((marks) => {
          this.submissionInfo = this.setupMark(marks);
        })
      );
  }

  private onColourChanged(colour: string) {
    if (this.assignmentSettings.defaultColour !== colour) {
      this.updateAssignmentSettings({
        ...this.assignmentSettings,
        defaultColour: colour
      });
    }
  }

  onPagedChanged(pageNumber: number) {
    this.currentPage = pageNumber;
    const pdfPage = this.pdfPages.get(pageNumber - 1);
    const pageElement: HTMLElement = pdfPage.elementRef.nativeElement;
    const pagesElement: HTMLElement = this.pagesWrapper.nativeElement;
    pagesElement.scrollTo({
      left: pagesElement.scrollLeft,
      top: pageElement.offsetTop - 64,
      behavior: 'smooth'
    });
  }

  onControl(control: string) {
    switch (control) {
      case 'save'     :   this.saveMarks().subscribe();
        break;
      case 'clearAll' :   this.clearMarks();
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
      case 'rotate-cw' :
        this.pdfPages.get(this.currentPage - 1).rotateClockwise();
        break;
      case 'rotate-ccw':
        this.pdfPages.get(this.currentPage - 1).rotateCounterClockwise();
        break;
      default         :   console.log('No control \'' + control + '\' found!');
        break;
    }
  }

  private updateAssignmentSettings(settings: AssignmentSettingsInfo) {
    this.busyService.start();
    this.assignmentService.updateAssignmentSettings(settings, this.workspaceName, this.assignmentName).subscribe({
      next: (assignmentSettings: AssignmentSettingsInfo) => {
        this.assignmentSettings = assignmentSettings;
        this.busyService.stop();
      },
      error: () => {
        this.busyService.stop();
      }}
    );
  }

  savePageSettings(pageIndex: number, pageSettings: PageSettings): Observable<any> {
    const originalSubmissionInfo = cloneDeep(this.submissionInfo);
    const markDetails = {
      ...this.submissionInfo,
      pageSettings: [].concat(this.submissionInfo.pageSettings)
    } as SubmissionInfo;
    markDetails.pageSettings[pageIndex] = pageSettings;
    this.busyService.start();

    // TODO ideally SubmissionInfo should contain the studentId...
    const studentDirectoryName = PdfmUtilsService.basename(PdfmUtilsService.dirname(this.pdf, 2));
    const submission = find(this.assignmentSettings.submissions, s => s.directoryName === studentDirectoryName);
    return this.assignmentService.saveMarks(this.workspaceName, this.assignmentName, submission.studentId, markDetails)
      .pipe(
        map(() => {
          this.busyService.stop();
          this.submissionInfo = this.setupMark(markDetails);
          this.appService.openSnackBar(true, 'Saved');
        })
      )
      .pipe(
        catchError((error) => {
          this.busyService.stop();
          this.submissionInfo = originalSubmissionInfo;
          this.appService.openSnackBar(false, 'Unable to save');
          return throwError(error);
        })
      );
  }


  /**
   * Save the marks for the specified page index
   * @param pageIndex
   * @param marks
   */
  savePageMarks(pageIndex: number, marks: MarkInfo[]): Observable<any> {
    const marksToSave = cloneDeep(this.submissionInfo.marks) as MarkInfo[][];
    marksToSave[pageIndex] = marks;
    return this.saveMarks(marksToSave);
  }

  /**
   * Saves the marks and returns an observable if the save succeeded
   */
  saveMarks(marks?: MarkInfo[][] | number[]): Observable<any> {
    const originalMarks = cloneDeep(this.submissionInfo);
    const markDetails = {
      ...this.submissionInfo,
      marks: marks || this.submissionInfo.marks
    } as MarkingSubmissionInfo;
    this.busyService.start();
    // TODO ideally SubmissionInfo should contain the studentId...
    const studentDirectoryName = PdfmUtilsService.basename(PdfmUtilsService.dirname(this.pdf, 2));
    const submission = find(this.assignmentSettings.submissions, s => s.directoryName === studentDirectoryName);
    return this.assignmentService.saveMarks(this.workspaceName, this.assignmentName, submission.studentId, markDetails)
      .pipe(
        map(() => {
          this.busyService.stop();
          this.submissionInfo = this.setupMark(markDetails);
          this.appService.openSnackBar(true, 'Saved');
        })
      )
      .pipe(
        catchError((error) => {
          this.busyService.stop();
          this.submissionInfo = originalMarks;
          this.appService.openSnackBar(false, error);
          return throwError(error);
        })
      );
  }

  /**
   * Clear all marks
   */
  clearMarks() {
    if (this.submissionInfo.marks.length > 0) {
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
    this.appService.createDialog(ConfirmationDialogComponent, config, shouldDeleteFn);
  }


  openNewMarkingCommentModal(): MatDialogConfig {
    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '500px';
    config.disableClose = true;
    config.data = {
      comment: null
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
    this.routeSubscription.unsubscribe();
    if (this.pdfDocument) {
      this.pdfDocument.cleanup().then(() => {
        return this.pdfDocument.destroy();
      }).then(() => this.pdfDocument = null);
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
