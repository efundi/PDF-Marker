import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {AnnotationLayer, PDFDocumentProxy, PDFPageProxy} from 'pdfjs-dist';
import {EventBus, LinkTarget, PDFLinkService} from 'pdfjs-dist/web/pdf_viewer';
import {MarkTypeIconComponent} from '../mark-type-icon/mark-type-icon.component';
import {IconTypeEnum} from '@shared/info-objects/icon-type.enum';
import {MarkingCommentModalComponent} from '../marking-comment-modal/marking-comment-modal.component';
import {AppService} from '../../../services/app.service';
import {AssignmentMarkingComponent} from '../assignment-marking.component';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {firstValueFrom, Observable, Subscription} from 'rxjs';
import {cloneDeep, isNil} from 'lodash';
import {AssignmentMarkingSessionService} from '../assignment-marking-session.service';
import {IconInfo} from '../../../info-objects/icon.info';
import {MarkTypeHighlightComponent} from '../mark-type-highlight/mark-type-highlight.component';
import {PageViewport} from 'pdfjs-dist/types/web/interfaces';
import {ScrollVisibilityDirective} from '../../../directives/scroll-visibility.directive';
import {BusyService} from '../../../services/busy.service';
import {PageSettings, SubmissionMarkType} from '@shared/info-objects/submission.info';
import {
  ConfirmationDialogComponent
} from '../../confirmation-dialog/confirmation-dialog.component';
import {MatDialogConfig} from '@angular/material/dialog';
import {RenderTask} from 'pdfjs-dist/types/src/display/api';
import {DEFAULT_MARKS} from '@shared/constants/constants';

const eventBus = new EventBus();

const pdfLinkService = new PDFLinkService({
  externalLinkTarget: LinkTarget.BLANK,
  eventBus,
});

const DPI_SCALE = window.devicePixelRatio || 1;


/**
 * This constant to offset the standard DPI (96) with a standard font points (72)
 * */
const PDF_SCALE_CONSTANT = (96 / 72);

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
   * Markers for this page
   */
  @Input()
  pageSettings: PageSettings;

  /**
   * Flag if editing is allowed on the page
   */
  @Input()
  editEnabled: boolean;

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
   * Reference to the page wrapper
   * @private
   */
  @ViewChild('pageWrapper', {static: true, read: ScrollVisibilityDirective})
  private pageWrapperScrollVisibility: ScrollVisibilityDirective;

  /**
   * Reference to the marker container
   * @private
   */
  @ViewChild('markerContainer', {static: true})
  private markerContainer: ElementRef<HTMLDivElement>;

  /**
   * Reference to the highlighter container
   * @private
   */
  @ViewChild('highlighter', {static: true})
  private highlighter: ElementRef<HTMLDivElement>;

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
  private page: PDFPageProxy;

  IconTypeEnum = IconTypeEnum;

  unlisteners = [];

  drag = false;

  /**
   * Indicator if we are still waiting for rendering to complete
   */
  renderState: 'WAITING' | 'RENDERING' | 'RENDERED' = 'WAITING';

  private viewport: PageViewport;
  private renderTask: RenderTask;

  constructor(private renderer: Renderer2,
              public elementRef: ElementRef,
              private appService: AppService,
              private busyService: BusyService,
              public assignmentMarkingComponent: AssignmentMarkingComponent,
              private assignmentMarkingSessionService: AssignmentMarkingSessionService,
              private ngZone: NgZone) { }


  ngOnDestroy() {
    this.iconSubscription.unsubscribe();
    if (this.renderTask) {
      this.renderTask.cancel();
    }
    this.page.cleanup();
  }

  ngOnInit(): void {
    this.iconSubscription = this.assignmentMarkingSessionService.iconChanged.subscribe((icon) => {
      this.onSelectedIcon(icon);
    });
  }

  /**
   * Create a new mark at the clicked position
   * @param event
   * @private
   */
  private createIconMark(event: MouseEvent): MarkInfo {
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
      colour
    };

    if (mark.iconType === IconTypeEnum.FULL_MARK) {
      mark.totalMark = DEFAULT_MARKS.FULL;
    } else if (mark.iconType === IconTypeEnum.HALF_MARK) {
      mark.totalMark = (DEFAULT_MARKS.FULL / 2);
    } else if (mark.iconType === IconTypeEnum.CROSS) {
      mark.totalMark = DEFAULT_MARKS.INCORRECT;
    } else if (mark.iconType === IconTypeEnum.NUMBER) {
      const config = this.assignmentMarkingComponent.openNewMarkingCommentModal();
      const handelCommentFN = (formData: any) => {
        if (formData && !formData.removeIcon) {
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

  resizePage() {
    this.renderState = 'WAITING';
    const zoom = this.assignmentMarkingSessionService.zoom;

    // Get the viewport at the current zoom * PDF scale constant
    this.viewport = this.page.getViewport({
      scale: (zoom * PDF_SCALE_CONSTANT),
      rotation: this.pageSettings.rotation
    });

    // Support HiDPI-screens by setting the width applying DPI Scaling
    this.renderer.setAttribute(this.pdfCanvas.nativeElement, 'width', Math.floor(this.viewport.width * DPI_SCALE) + '');
    this.renderer.setAttribute(this.pdfCanvas.nativeElement, 'height',  Math.floor(this.viewport.height * DPI_SCALE) + '');

    // Set the render size in pixels
    this.renderer.setStyle(this.pdfCanvas.nativeElement, 'height',  Math.floor(this.viewport.height) + 'px');
    this.renderer.setStyle(this.pdfCanvas.nativeElement, 'width',  Math.floor(this.viewport.width) + 'px');

    // Size the page wrapper so that it centers properly
    this.renderer.setStyle(this.pageWrapper.nativeElement, 'height',  Math.floor(this.viewport.height) + 'px');
    this.renderer.setStyle(this.pageWrapper.nativeElement, 'width',  Math.floor(this.viewport.width) + 'px');
    this.pageWrapperScrollVisibility.resetVisibility();
  }

  onVisibilityChanged(visible: boolean) {
    if (visible) {
      this.renderPage();
    }
  }

  renderPage(): Promise<any> {
    if (this.renderState !== 'WAITING') {
      return;
    }
    this.renderState = 'RENDERING';
    const ctx = this.pdfCanvas.nativeElement.getContext('2d');
    this.page.getAnnotations().then(annotationData => {

      // First remove all existing annotations
      while (this.annotationLayer.nativeElement.firstChild) {
        this.annotationLayer.nativeElement.removeChild(this.annotationLayer.nativeElement.lastChild);
      }

      AnnotationLayer.render({
        viewport: this.viewport.clone({ dontFlip: true }),
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

    this.renderTask = this.page.render({
      canvasContext: ctx,
      viewport: this.viewport,
      transform
    });
    return this.renderTask.promise.then(() => {
      this.renderTask = null;
      this.renderState = 'RENDERED';
    }, () => {
      this.renderTask = null;
    });
  }

  ngAfterViewInit() {

    this.busyService.start();
    this.pdf.getPage(this.pageIndex + 1).then((page) => {
      this.page = page;

      if (isNil(this.pageSettings.rotation)) {
        // If no rotation has been set by the user, use the PDF page rotation
        this.pageSettings.rotation = this.page.rotate;
      }

      this.resizePage();
    }).then(() => {
      this.busyService.stop();
    });
  }

  /**
   * Callback when a tool is changed
   * @param selectedIcon Either a new tool, or null
   * @private
   */
  private onSelectedIcon(selectedIcon?: IconInfo) {

    // Reset views
    this.unregisterHighlighter();
    this.renderer.removeClass(this.markerContainer.nativeElement, 'cursor-copy');
    this.renderer.removeClass(this.markerContainer.nativeElement, 'cursor-text');
    this.renderer.removeStyle(this.markerContainer.nativeElement, 'display');
    // this.renderer.removeStyle(this.annotationLayer.nativeElement, 'display');

    if (selectedIcon) {
      if (selectedIcon.type !== IconTypeEnum.HIGHLIGHT) {
        this.renderer.addClass(this.markerContainer.nativeElement, 'cursor-copy');
      } else {
        this.renderer.addClass(this.markerContainer.nativeElement, 'cursor-text');
        this.registerHighlighter();
      }

      // Hide the annotation layer which can be in the way of the dropzone
      // this.renderer.setStyle(this.annotationLayer.nativeElement, 'display', 'none');
      this.renderer.setStyle(this.markerContainer.nativeElement, 'display', 'block');
    }

  }

  private registerHighlighter() {
    this.ngZone.runOutsideAngular(() => {
      this.unlisteners.push(this.renderer.listen(this.markerContainer.nativeElement, 'mousemove', (e) => this.mouseMove(e)));
      this.unlisteners.push(this.renderer.listen(this.markerContainer.nativeElement, 'mouseup', () => this.mouseUp()));
    });
  }

  private clearHighlighter() {
    this.renderer.setStyle(this.highlighter.nativeElement, 'left', '0');
    this.renderer.setStyle(this.highlighter.nativeElement, 'top', '0');
    this.renderer.setStyle(this.highlighter.nativeElement, 'width', '0');
    this.renderer.removeAttribute(this.highlighter.nativeElement, 'data-left');
    this.renderer.removeStyle(this.highlighter.nativeElement, 'display');
  }

  private unregisterHighlighter() {
    this.unlisteners.forEach((ul) => ul());
    this.clearHighlighter();
  }

  private createMarkHighlight() {
    // Minimum width to be considered a highlight
    const MIN_HIGHLIGHT = 20;

    const zoom = this.assignmentMarkingSessionService.zoom;

    const leftPx = this.highlighter.nativeElement.style.left;
    const topPx = this.highlighter.nativeElement.style.top;
    const widthPx = this.highlighter.nativeElement.style.width;
    let left = +leftPx.substring(0, leftPx.length - 2);
    let top = +topPx.substring(0, topPx.length - 2);
    let width = +widthPx.substring(0, widthPx.length - 2);

    left = left / zoom;
    top = top / zoom;
    width = width / zoom;

    if (width < MIN_HIGHLIGHT) {
      // Highlight is too small
      return;
    }


    const mark: MarkInfo = {
      coordinates: {
        x: left,
        y: top,
        width
      },
      iconName: this.assignmentMarkingSessionService.icon.icon,
      iconType: this.assignmentMarkingSessionService.icon.type,
      colour: this.highlighter.nativeElement.style.background,
      totalMark: 0,
      comment: null
    };

    const updatedMarks: MarkInfo[] = cloneDeep(this.marks);
    updatedMarks.push(mark);
    this.assignmentMarkingComponent.savePageMarks(this.pageIndex, updatedMarks).subscribe({
      complete: () => {
        this.clearHighlighter();
      }
    });
  }

  private createMarkIcon(event: MouseEvent) {
    const mark = this.createIconMark(event);
    if (mark.iconType !== IconTypeEnum.NUMBER) {
      const updatedMarks: MarkInfo[] = cloneDeep(this.marks);
      updatedMarks.push(mark);
      this.assignmentMarkingComponent.savePageMarks(this.pageIndex, updatedMarks).subscribe();
    }
  }

  onDropClick($event: MouseEvent) {
    if (this.assignmentMarkingSessionService.icon) {
      switch (this.assignmentMarkingSessionService.icon.type) {
        case IconTypeEnum.HIGHLIGHT :
          break;
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

  mouseDown(e: MouseEvent) {
    this.ngZone.run(() => {

      const zoom = this.assignmentMarkingSessionService.zoom;

      const height = zoom * MarkTypeHighlightComponent.HIGHLIGHT_HEIGHT;

      this.renderer.setStyle(this.highlighter.nativeElement, 'display', 'block');
      this.renderer.setStyle(this.highlighter.nativeElement, 'left', e.offsetX + 'px');
      this.renderer.setStyle(this.highlighter.nativeElement, 'top', (e.offsetY - (height / 2)) + 'px');
      this.renderer.setStyle(this.highlighter.nativeElement, 'width', '0');
      this.renderer.setStyle(this.highlighter.nativeElement, 'height', height + 'px');
      this.renderer.setStyle(this.highlighter.nativeElement, 'background', this.assignmentMarkingSessionService.highlighterColour.colour);

      this.renderer.setAttribute(this.highlighter.nativeElement, 'data-left', e.offsetX + '');
    });
    this.drag = true;
  }

  mouseUp() {
    this.drag = false;
    this.ngZone.run(() => {
      this.createMarkHighlight();
    });
  }

  mouseMove(e: MouseEvent) {
    if (this.drag) {
      this.ngZone.run(() => {
        const left = +this.highlighter.nativeElement.getAttribute('data-left');
        const width = ((e.offsetX) - left);
        this.renderer.setStyle(this.highlighter.nativeElement, 'width', width + 'px');
      });
    }
  }

  /**
   * Prompt to warn the user that marks will be removed when rotation the page
   * @private
   */
  private promptMarksRemove(): Promise<boolean> {

    if (this.assignmentMarkingComponent.submissionInfo.type === SubmissionMarkType.RUBRIC) {
      return Promise.resolve(true);
    }

    if (this.marks.length === 0) {
      return Promise.resolve(true);
    }

    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '400px';
    config.data = {
      title: 'Rotate page',
      message: 'Rotating the page will cause marks to be removed',
    };
    let resolve;
    const promise = new Promise<boolean>((r) => resolve = r);

    this.appService.createDialog(ConfirmationDialogComponent, config, resolve);

    return promise.then((remove) => {
      if (!remove) {
        return Promise.reject();
      }
      return firstValueFrom(this.assignmentMarkingComponent.savePageMarks(this.pageIndex, []));
    });
  }



  public rotateClockwise() {
    this.promptMarksRemove().then(() => {
      const settings = cloneDeep(this.pageSettings);
      if (settings.rotation === 270) {
        settings.rotation = 0;
      } else {
        settings.rotation = settings.rotation + 90;
      }
      this.assignmentMarkingComponent.savePageSettings(this.pageIndex, settings).subscribe(() => {
        this.pageSettings = settings;
        this.resizePage();
        this.renderPage();
      });
    }, (err) => {
      console.error(err);
    });

  }

  public rotateCounterClockwise() {
    this.promptMarksRemove().then(() => {
      const settings = cloneDeep(this.pageSettings);
      if (settings.rotation === 0) {
        settings.rotation = 270;
      } else {
        settings.rotation = settings.rotation - 90;
      }
      this.assignmentMarkingComponent.savePageSettings(this.pageIndex, settings).subscribe(() => {
        this.pageSettings = settings;
        this.resizePage();
        this.renderPage();
      });
    }, (err) => {
      console.error(err);
    });
  }
}
