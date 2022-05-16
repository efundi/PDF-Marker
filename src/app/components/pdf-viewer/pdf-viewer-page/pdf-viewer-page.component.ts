import {Component, ElementRef, Input, OnDestroy, OnInit, Renderer2, ViewChild} from '@angular/core';
import {AnnotationLayer, PDFDocumentProxy, PDFPageProxy} from 'pdfjs-dist';
import {PageSettings} from '@shared/info-objects/submission.info';
import {ScrollVisibilityDirective} from '../../../directives/scroll-visibility.directive';
import {AppService} from '../../../services/app.service';
import {BusyService} from '../../../services/busy.service';
import {EventBus, LinkTarget, PDFLinkService} from 'pdfjs-dist/web/pdf_viewer';
import {PageViewport} from 'pdfjs-dist';

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
  selector: 'pdf-marker-pdf-viewer-page',
  templateUrl: './pdf-viewer-page.component.html',
  styleUrls: ['./pdf-viewer-page.component.scss']
})
export class PdfViewerPageComponent implements OnInit, OnDestroy {
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
  pageSettings: PageSettings;

  _zoom = 1.0;

  @Input()
  set zoom(zoom: number) {
    this._zoom = zoom;
    if (this.page) {
      this.resizePage();
    }
  }


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
   * Reference to the canvas on which the PDF will be rendered
   * @private
   */
  @ViewChild('pdfCanvas', {static: true})
  private pdfCanvas: ElementRef<HTMLCanvasElement>;

  private page: PDFPageProxy;

  /**
   * Indicator if we are still waiting for rendering to complete
   */
  renderState: 'WAITING' | 'RENDERING' | 'RENDERED' = 'WAITING';

  private viewport: PageViewport;


  constructor(private renderer: Renderer2,
              public elementRef: ElementRef,
              private appService: AppService,
              private busyService: BusyService) { }

  ngOnInit(): void {
  }

  ngOnDestroy() {
    this.page.cleanup();
  }

  resizePage() {
    this.renderState = 'WAITING';

    // Get the viewport at the current zoom * PDF scale constant
    this.viewport = this.page.getViewport({
      scale: (this._zoom * PDF_SCALE_CONSTANT),
      rotation: this.page.rotate
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
    this.page.getAnnotations({intent: 'any'}).then(annotationData => {

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

    const renderTask = this.page.render({
      canvasContext: ctx,
      viewport: this.viewport,
      transform
    });
    return renderTask.promise.then(() => {
      this.renderState = 'RENDERED';
    });
  }

  ngAfterViewInit() {

    this.busyService.start();
    this.pdf.getPage(this.pageIndex + 1).then((page) => {
      this.page = page;
      this.resizePage();
    }).then(() => {
      this.busyService.stop();
    });
  }
}
