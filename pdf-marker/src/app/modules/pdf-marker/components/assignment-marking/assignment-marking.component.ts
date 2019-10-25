import {
  Component,
  ComponentFactory,
  ComponentFactoryResolver,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {Subscription} from "rxjs";
import {ActivatedRoute, Router} from "@angular/router";
import {MarkTypeIconComponent} from "@pdfMarkerModule/components/mark-type-icon/mark-type-icon.component";
import {AppService} from "@coreModule/services/app.service";


@Component({
  selector: 'pdf-marker-assignment-marking',
  templateUrl: './assignment-marking.component.html',
  styleUrls: ['./assignment-marking.component.scss'],
  providers: []
})
export class AssignmentMarkingComponent implements OnInit, OnDestroy {
  @ViewChild('container', {static: false})
  container: ElementRef;

  @ViewChild('markerContainer', {static: false})
  markerContainer: ElementRef;

  private minWidth: number;
  private minHeight: number;

  show: boolean;

  pdfPath :string;

  // @ts-ignore
  @ViewChild('pdfViewerAutoLoad') pdfViewerAutoLoad;

  @ViewChild('containerRef', {read: ViewContainerRef, static: false})
  actualContainer: ViewContainerRef;

  private selectedIcon: string;
  private pdfPages: number = 0;
  private currentPage: number = 0;
  private pageElements: any[] = [];
  private subscription: Subscription;
  private viewerContainer;

  constructor(private renderer: Renderer2,
              private assignmentService: AssignmentService,
              private el: ElementRef,
              private resolver: ComponentFactoryResolver,
              private route: ActivatedRoute,
              private router: Router,
              private appService: AppService) { }

  ngOnInit() {
    if(!this.assignmentService.getSelectedPdfURL()){
      this.router.navigate(["/marker"]);
    }
    this.openPDF();
    this.subscription = this.assignmentService.selectedPdfURLChanged().subscribe(pdfPath => {
      if(pdfPath) {
        this.pdfPath = pdfPath;
        this.pdfViewerAutoLoad.pdfSrc = this.pdfPath; // pdfSrc can be Blob or Uint8Array
        this.pdfViewerAutoLoad.refresh(); // Ask pdf viewer to load/refresh pdf
        console.log(this.pdfPath);
        console.log("refreshed");
        //console.log(this.pdfViewerAutoLoad.iframe.nativeElement.height);
      }
    });
  }

  private openPDF() {
    this.pdfPath = this.assignmentService.getSelectedPdfURL();
    //console.log(this.pdfViewerAutoLoad.PDFViewerApplicationOptions);
  }

  onSelectedIcon(selectedIcon: string) {
    this.selectedIcon = selectedIcon;
    if(this.selectedIcon) {
      console.log("Selected Icon is ", selectedIcon);
      this.renderer.addClass(this.markerContainer.nativeElement, 'pdf-marker-dropzone');
    } else {
      console.log('None selected');
      this.renderer.removeClass(this.markerContainer.nativeElement, 'pdf-marker-dropzone');
    }
  }

  pagesLoaded(pageNumber) {
    this.pdfPages = pageNumber;
    this.pageElements = [];
    for(let i = 0; i < this.pdfPages; i++) {
      this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[i].style.border = "none";
      this.pageElements.push(this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[i]);
    }

    console.log(this.pdfViewerAutoLoad);
    this.currentPage = this.pdfViewerAutoLoad.PDFViewerApplication.page;
    this.container.nativeElement.style.height = this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[this.currentPage].clientHeight + 'px';
    this.markerContainer.nativeElement.style.height = this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.container.scrollHeight + 'px';
    this.container.nativeElement.style.height = this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.container.scrollHeight + 'px';
    //this.markerContainer.nativeElement.style.width = this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[this.currentPage].clientWidth + 'px';
    this.renderer.listen(window, 'resize-end', (event) => {
      this.container.nativeElement.style.height = this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[this.currentPage].clientHeight + 'px';
      console.log(this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[this.currentPage].height);
      console.log(this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[this.currentPage].clientHeight);
      console.log(this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[this.currentPage].offsetHeight);
      console.log(this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[this.currentPage].style.height);
    });

    this.pdfViewerAutoLoad.receiveMessage(viewerEvent => {
      console.log(viewerEvent);
    });
    this.show = true;
  }

  onDropClick(event) {
    console.log(event);
    if(this.selectedIcon) {
      const factory: ComponentFactory<MarkTypeIconComponent> = this.resolver.resolveComponentFactory(MarkTypeIconComponent);
      const componentRef = this.actualContainer.createComponent(factory);
      componentRef.instance.iconName = this.selectedIcon;
      this.renderer.setStyle(componentRef.location.nativeElement, 'position', 'absolute');
      const minWidth = this.markerContainer.nativeElement.scrollWidth - 36;
      const minHeight = this.markerContainer.nativeElement.scrollHeight - 36;

      const top = event.offsetY - 18;
      const left = event.offsetX - 18;

      console.log(minHeight);
      console.log(minWidth);
      console.log(this.markerContainer.nativeElement.scrollHeight);
      console.log(this.markerContainer.nativeElement.scrollWidth);
      console.log('Top: ' + top);
      console.log('Left: ' + left);

      this.renderer.setStyle(componentRef.location.nativeElement, 'top', ((top < 0) ? 0:((top > minHeight) ? minHeight:top)) + 'px');
      this.renderer.setStyle(componentRef.location.nativeElement, 'left', ((left < 0) ? 0:((left > minWidth) ? minWidth:left)) + 'px');
      componentRef.instance.setComponentRef(componentRef);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
