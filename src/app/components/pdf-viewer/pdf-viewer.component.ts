import {
  Component,
  ComponentFactoryResolver,
  ElementRef,
  OnInit,
  QueryList,
  Renderer2,
  ViewChildren
} from '@angular/core';
import {getDocument, PDFDocumentProxy} from "pdfjs-dist";
import {
  AssignmentMarkingPageComponent
} from "../assignment-marking/assignment-marking-page/assignment-marking-page.component";
import {PdfViewerPageComponent} from "./pdf-viewer-page/pdf-viewer-page.component";
import {from, mergeMap, Observable, Subscription} from "rxjs";
import {AssignmentService} from "../../services/assignment.service";
import {BusyService} from "../../services/busy.service";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute, Router} from "@angular/router";
import {AppService} from "../../services/app.service";
import {
  AssignmentMarkingSessionService,
  ZoomChangeEvent
} from "../assignment-marking/assignment-marking-session.service";
import {isNil} from "lodash";
import {ToolbarSettingChange} from "./pdf-viewer-toolbar/pdf-viewer-toolbar.component";

@Component({
  selector: 'pdf-marker-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnInit {

  /**
   * Reference to the assignment marking pages
   * Keep in mind that this changes dynamically, referencing it too soon in the Angular lifecycle
   * will cause errors
   */
  @ViewChildren('pdfPage', {read: PdfViewerPageComponent})
  pdfPages: QueryList<PdfViewerPageComponent>;

  isPdfLoaded: boolean;
  pdfDocument: PDFDocumentProxy;
  private workspaceName: string;
  private assignmentName: string;
  private pdf: string;

  private paramsSubscription: Subscription;
  currentPage = 1;
  zoom = 1.0;


  constructor(private renderer: Renderer2,
              private assignmentService: AssignmentService,
              private busyService: BusyService,
              private el: ElementRef,
              private dialog: MatDialog,
              private activatedRoute: ActivatedRoute) { }


  repeatPerPage(): [] | Array<any> {
    if (isNil(this.pdfDocument)) {
      return [];
    } else {
      return new Array(this.pdfDocument.numPages);
    }
  }



  ngOnInit(): void {
    this.paramsSubscription = this.activatedRoute.params.subscribe((params) => {
      this.workspaceName = params['workspaceName'];
      this.assignmentName = params['assignmentName'];
      this.pdf = params['pdf'];

      this.isPdfLoaded = false;
      this.assignmentService.getFile(this.pdf)
        .pipe(
          mergeMap((data) => this.loadPdf(data))
        ).subscribe(() => {

        this.isPdfLoaded = true;
      }, (error) => {
        console.error(error)
      })
    });

  }

  onSectionChange($event: string) {
    let pageIndex = +$event;
    if (isNaN(pageIndex)) {
      pageIndex = 0;
    }
    this.currentPage = pageIndex + 1;
  }


  private loadPdf(data: Uint8Array): Observable<PDFDocumentProxy> {
    const promise = getDocument(data).promise.then((pdf) => {
      this.pdfDocument = pdf;
      return pdf;
    });

    return from(promise);
  }

  onPagedChanged(pageNumber: number) {
    this.currentPage = pageNumber;
    this.pdfPages.get(pageNumber - 1).scrollIntoView();
  }

  settingChanged(settingChange: ToolbarSettingChange) {
    if (settingChange.zoom) {
      this.zoom = settingChange.zoom.current;
      this.zoomChanged(settingChange.zoom);
    }
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
