import {
  AfterViewInit,
  Component,
  ComponentFactory, ComponentRef,
  ElementRef,
  Input,
  OnInit,
  Renderer2,
  ViewChild, ViewContainerRef
} from '@angular/core';
import {AnnotationLayer, PDFDocumentProxy} from 'pdfjs-dist';
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
import {isNil, cloneDeep} from 'lodash-es';
import {
  AssignmentMarkingSessionService
} from '@pdfMarkerModule/components/assignment-marking/assignment-marking-session.service';
import {IconInfo} from '@pdfMarkerModule/info-objects/icon.info';

const eventBus = new EventBus();

const pdfLinkService = new PDFLinkService({
  eventBus,
});

const DPI_SCALE = window.devicePixelRatio || 1;

@Component({
  selector: 'pdf-marker-assignment-marking-page',
  templateUrl: './assignment-marking-page.component.html',
  styleUrls: ['./assignment-marking-page.component.scss']
})
export class AssignmentMarkingPageComponent implements OnInit, AfterViewInit {

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

  constructor(private renderer: Renderer2,
              private appService: AppService,
              private assignmentMarkingComponent: AssignmentMarkingComponent,
              private assignmentMarkingSessionService: AssignmentMarkingSessionService) { }

  ngOnInit(): void {
    console.log(`page=${this.pageIndex}`);

    this.iconSubscription = this.assignmentMarkingSessionService.iconChanged.subscribe((icon) => {
      this.onSelectedIcon(icon);
    });
  }

  private createMark(event: MouseEvent): MarkInfo {
    const pageNumber = this.pageIndex + 1;

    let top = event.offsetY - (MarkTypeIconComponent.widthAndHeight / 2) ;
    let left = event.offsetX -  (MarkTypeIconComponent.widthAndHeight / 2);

    const minWidth = this.markerContainer.nativeElement.scrollWidth - MarkTypeIconComponent.widthAndHeight;
    const minHeight = this.markerContainer.nativeElement.scrollHeight - MarkTypeIconComponent.widthAndHeight;

    top = ((top < 0) ? 0 : ((top > minHeight) ? minHeight : top));
    left = ((left < 0) ? 0 : ((left > minWidth) ? minWidth : left));

    const colour = this.assignmentMarkingSessionService.colour;

    const mark: MarkInfo = {
      coordinates: {
        x: left,
        y: top
      },
      iconName: this.assignmentMarkingSessionService.icon.icon,
      iconType: this.assignmentMarkingSessionService.icon.type,
      colour,
      pageNumber: pageNumber,
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

  ngAfterViewInit() {

    this.appService.isLoading$.next(true);
    // TODO an improvement here could be to wait until the page is in view before attempting to render it
    this.pdf.getPage(this.pageIndex + 1).then((page) => {
      const viewport = page.getViewport({ scale: 1.33 }); // TODO get zoom

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

      page.getAnnotations().then(annotationData => {
        this.renderer.addClass(this.annotationLayer.nativeElement, 'annotation-layer');


        AnnotationLayer.render({
          viewport: viewport.clone({ dontFlip: true }),
          div: this.annotationLayer.nativeElement,
          annotations: annotationData,
          page: page,
          renderForms: false,
          linkService: pdfLinkService,
          downloadManager: null
        });
      });

      const transform = DPI_SCALE !== 1
        ? [DPI_SCALE, 0, 0, DPI_SCALE, 0, 0]
        : null;

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
        transform
      });
      return renderTask.promise;
    }).then(() => {
      this.appService.isLoading$.next(false);
    });
  }

  private onSelectedIcon(selectedIcon?: IconInfo) {
    if (selectedIcon) {
      this.renderer.addClass(this.markerContainer.nativeElement, 'pdf-marker-dropzone');
    } else {
      this.renderer.removeClass(this.markerContainer.nativeElement, 'pdf-marker-dropzone');
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
