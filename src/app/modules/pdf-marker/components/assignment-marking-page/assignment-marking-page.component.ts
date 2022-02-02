import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {AnnotationLayer, PDFDocumentProxy, PDFPageProxy} from 'pdfjs-dist';
import {EventBus, PDFLinkService} from 'pdfjs-dist/web/pdf_viewer';
import {MarkTypeIconComponent} from '@pdfMarkerModule/components/mark-type-icon/mark-type-icon.component';
import {IconTypeEnum} from '@pdfMarkerModule/info-objects/icon-type.enum';
import {
  MarkingCommentModalComponent
} from '@sharedModule/components/marking-comment-modal/marking-comment-modal.component';
import {AppService} from '@coreModule/services/app.service';
import {AssignmentMarkingComponent} from '@pdfMarkerModule/components/assignment-marking/assignment-marking.component';
import {MarkInfo} from '@sharedModule/info-objects/mark.info';
import {Observable, Subscription} from 'rxjs';
import {cloneDeep, isNil} from 'lodash-es';
import {
  AssignmentMarkingSessionService
} from '@pdfMarkerModule/components/assignment-marking/assignment-marking-session.service';
import {IconInfo} from '@pdfMarkerModule/info-objects/icon.info';

const eventBus = new EventBus();

const pdfLinkService = new PDFLinkService({
  eventBus,
});

const DPI_SCALE = window.devicePixelRatio || 1;


/**
 * This constant is the match the scale of PDF < v3 where a different rendering component was used
 * The constant is required to keep the coordinates and page size simmiliar to < v3
 * */
const PDF_SCALE_CONSTANT = 1.33;

@Component({
  selector: 'pdf-marker-assignment-marking-page',
  templateUrl: './assignment-marking-page.component.html',
  styleUrls: ['./assignment-marking-page.component.scss']
})
export class AssignmentMarkingPageComponent implements OnInit, AfterViewInit, OnDestroy {

  /**
   * Index of the PDF page that will be rendered here
   */
  @Input()
  pageIndex: number;

  /**
   * PDF that will be rendered
   */
  @Input()
  pdf: PDFDocumentProxy;

  /**
   * Markers for this page
   */
  @Input()
  marks: MarkInfo[] = [];

  /**
   * Reference to the annotation layer
   * @private
   */
  @ViewChild('annotationLayer', {static: true})
  private annotationLayer: ElementRef<HTMLDivElement>;

  /**
   * Reference to the page wrapper
   * @private
   */
  @ViewChild('pageWrapper', {static: true})
  private pageWrapper: ElementRef<HTMLDivElement>;

  /**
   * Reference to the marker container
   * @private
   */
  @ViewChild('markerContainer', {static: true})
  private markerContainer: ElementRef<HTMLDivElement>;

  /**
   * Reference to the markers
   * @private
   */
  @ViewChild('marksLayer', { read: ViewContainerRef })
  private marksLayer: ViewContainerRef;

  /**
   * Reference to the canvas on which the PDF will be rendered
   * @private
   */
  @ViewChild('pdfCanvas', {static: true})
  private pdfCanvas: ElementRef<HTMLCanvasElement>;

  private iconSubscription: Subscription;
  private zoomSubscription: Subscription;
  private page: PDFPageProxy;

  constructor(private renderer: Renderer2,
              private appService: AppService,
              private assignmentMarkingComponent: AssignmentMarkingComponent,
              private assignmentMarkingSessionService: AssignmentMarkingSessionService) { }


  ngOnDestroy() {
    this.iconSubscription.unsubscribe();
    this.zoomSubscription.unsubscribe();

    this.page.cleanup();
  }

  ngOnInit(): void {
    this.iconSubscription = this.assignmentMarkingSessionService.iconChanged.subscribe((icon) => {
      this.onSelectedIcon(icon);
    });

    this.zoomSubscription = this.assignmentMarkingSessionService.zoomChanged.subscribe((zoom) => {
      this.renderPage();
    });
  }

  /**
   * Create a new mark at the clicked position
   * @param event
   * @private
   */
  private createMark(event: MouseEvent): MarkInfo {
    const zoom = this.assignmentMarkingSessionService.zoom;
    const colour = this.assignmentMarkingSessionService.colour;

    /*
     * The coordinates are saved at the top left of the icon, find the middle
     * of the icon to properly position at any zoom level (the icon stays the same size)
     */
    const ICON_MIDDLE = (MarkTypeIconComponent.widthAndHeight / 2);

    /*
    * Divide by the zoom
    * Subtract the middle from the icon
    * Now the icon will be placed correctly for the zoom level
    */
    const top = (event.offsetY / zoom) - ICON_MIDDLE ;
    const left = (event.offsetX / zoom) - ICON_MIDDLE;


    const mark: MarkInfo = {
      coordinates: {
        x: left,
        y: top
      },
      iconName: this.assignmentMarkingSessionService.icon.icon,
      iconType: this.assignmentMarkingSessionService.icon.type,
      colour,
      pageNumber: this.pageIndex + 1,
    };

    if (mark.iconType === IconTypeEnum.FULL_MARK) {
      mark.totalMark = this.assignmentMarkingComponent.defaultFullMark;
    } else if (mark.iconType === IconTypeEnum.HALF_MARK) {
      mark.totalMark = (this.assignmentMarkingComponent.defaultFullMark / 2);
    } else if (mark.iconType === IconTypeEnum.CROSS) {
      mark.totalMark = this.assignmentMarkingComponent.defaultIncorrectMark;
    } else if (mark.iconType === IconTypeEnum.NUMBER) {
      const config = this.assignmentMarkingComponent.openNewMarkingCommentModal('Marking Comment', '');
      const handelCommentFN = (formData: any) => {
        if (formData.removeIcon) {
          // TODO remove item from the list
        } else {
          mark.totalMark = formData.totalMark;
          mark.sectionLabel = formData.sectionLabel;
          mark.comment = formData.markingComment;
          const updatedMarks: MarkInfo[] = cloneDeep(this.marks);
          updatedMarks.push(mark);
          this.assignmentMarkingComponent.savePageMarks(this.pageIndex, updatedMarks).subscribe();
        }
      };
      this.appService.createDialog(MarkingCommentModalComponent, config, handelCommentFN);
    }

    return mark;
  }

  private renderPage() {
    const zoom = this.assignmentMarkingSessionService.zoom;

    // Get the viewport at the current zoom * PDF scale constant
    const viewport = this.page.getViewport({ scale: (zoom * PDF_SCALE_CONSTANT) });

    // Support HiDPI-screens by setting the width applying DPI Scaling
    this.renderer.setAttribute(this.pdfCanvas.nativeElement, 'width', Math.floor(viewport.width * DPI_SCALE) + '');
    this.renderer.setAttribute(this.pdfCanvas.nativeElement, 'height',  Math.floor(viewport.height * DPI_SCALE) + '');

    // Set the render size in pixels
    this.renderer.setStyle(this.pdfCanvas.nativeElement, 'height',  Math.floor(viewport.height) + 'px');
    this.renderer.setStyle(this.pdfCanvas.nativeElement, 'width',  Math.floor(viewport.width) + 'px');

    // Size the page wrapper so that it centers properly
    this.renderer.setStyle(this.pageWrapper.nativeElement, 'height',  Math.floor(viewport.height) + 'px');
    this.renderer.setStyle(this.pageWrapper.nativeElement, 'width',  Math.floor(viewport.width) + 'px');
    const ctx = this.pdfCanvas.nativeElement.getContext('2d');

    this.page.getAnnotations().then(annotationData => {

      // First remove all existing annotations
      while (this.annotationLayer.nativeElement.firstChild) {
        this.annotationLayer.nativeElement.removeChild(this.annotationLayer.nativeElement.lastChild);
      }

      AnnotationLayer.render({
        viewport: viewport.clone({ dontFlip: true }),
        div: this.annotationLayer.nativeElement,
        annotations: annotationData,
        page: this.page,
        renderForms: false,
        linkService: pdfLinkService,
        downloadManager: null
      });
    });

    const transform = DPI_SCALE !== 1
      ? [DPI_SCALE, 0, 0, DPI_SCALE, 0, 0]
      : null;

    const renderTask = this.page.render({
      canvasContext: ctx,
      viewport,
      transform
    });
    return renderTask.promise;
  }

  ngAfterViewInit() {

    this.appService.isLoading$.next(true);

    // TODO an improvement here could be to wait until the page is in view before attempting to render it
    this.pdf.getPage(this.pageIndex + 1).then((page) => {
      this.page = page;
      return this.renderPage();

    }).then(() => {
      this.appService.isLoading$.next(false);
    });
  }

  private onSelectedIcon(selectedIcon?: IconInfo) {
    if (selectedIcon) {
      this.renderer.addClass(this.markerContainer.nativeElement, 'pdf-marker-dropzone');

      // Hide the annotation layer which can be in the way of the dropzone
      this.renderer.setStyle(this.annotationLayer.nativeElement, 'display', 'none');
    } else {
      this.renderer.removeClass(this.markerContainer.nativeElement, 'pdf-marker-dropzone');

      // Put back the annotation layer
      this.renderer.removeStyle(this.annotationLayer.nativeElement, 'display');
    }
  }

  private createMarkIcon(event: MouseEvent) {
    const mark = this.createMark(event);
    if (mark.iconType !== IconTypeEnum.NUMBER) {
      const updatedMarks: MarkInfo[] = cloneDeep(this.marks);
      updatedMarks.push(mark);
      this.assignmentMarkingComponent.savePageMarks(this.pageIndex, updatedMarks).subscribe();
    }
  }

  onDropClick($event: MouseEvent) {
    if (this.assignmentMarkingSessionService.icon) {
      switch (this.assignmentMarkingSessionService.icon.type) {
        case IconTypeEnum.FULL_MARK :
        case IconTypeEnum.HALF_MARK :
        case IconTypeEnum.ACK_MARK  :
        case IconTypeEnum.CROSS     :
        case IconTypeEnum.NUMBER    : this.createMarkIcon($event);
          break;
        default:  console.log('No icon type found!');
          break;
      }
    }
  }

  onMarkChanged(index: number, mark: MarkInfo): Observable<any> {
    const updatedMarks: MarkInfo[] = cloneDeep(this.marks);
    if (isNil(mark)) {
      updatedMarks.splice(index, 1);
    } else {
      updatedMarks[index] = mark;
    }
    return this.assignmentMarkingComponent.savePageMarks(this.pageIndex, updatedMarks);
  }
}
