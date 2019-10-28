import {
  Component,
  ComponentFactory,
  ComponentFactoryResolver,
  ComponentRef,
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
import {IconInfo} from "@pdfMarkerModule/info-objects/icon.info";
import {IconTypeEnum} from "@pdfMarkerModule/info-objects/icon-type.enum";


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

  private selectedIcon: IconInfo;
  private pdfPages: number = 0;
  private currentPage: number = 0;
  private pageElements: any[] = [];
  private subscription: Subscription;
  private markDetails: ComponentRef<MarkTypeIconComponent>[] = [];
  private viewerContainer;

  private data = [
    { coordinates: {x: 346, y: 1230}, iconName: "check", iconType: IconTypeEnum.FULL_MARK},
    { coordinates: {x: 300, y: 1261}, iconName: "check", iconType: IconTypeEnum.FULL_MARK},
    { coordinates: {x: 347, y: 1289}, iconName: "check", iconType: IconTypeEnum.FULL_MARK},
    { coordinates: {x: 685, y: 1317}, iconName: "check", iconType: IconTypeEnum.FULL_MARK},
    { coordinates: {x: 688, y: 1377}, iconName: "check", iconType: IconTypeEnum.FULL_MARK},
  ];

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
    try {
      this.selectedIcon = JSON.parse(selectedIcon);
      this.renderer.addClass(this.markerContainer.nativeElement, 'pdf-marker-dropzone');
    } catch (e) {
      console.log('None selected');
      this.selectedIcon = undefined;
      this.renderer.removeClass(this.markerContainer.nativeElement, 'pdf-marker-dropzone');
    }
  }

  pagesLoaded(pageNumber) {
    this.pdfPages = pageNumber;
    this.pageElements = [];
    this.markDetails = [];
    /*for(let i = 0; i < this.pdfPages; i++) {
      this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[i].style.border = "none";
      this.pageElements.push(this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[i]);
    }*/

    console.log(this.pdfViewerAutoLoad);
    this.currentPage = this.pdfViewerAutoLoad.PDFViewerApplication.page;
    this.container.nativeElement.style.height = this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.viewer.children[this.currentPage - 1].clientHeight + 'px';
    this.markerContainer.nativeElement.style.height = this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.container.scrollHeight + 'px';
    this.container.nativeElement.style.height = this.pdfViewerAutoLoad.PDFViewerApplication.pdfViewer.container.scrollHeight + 'px';

    // Set Data

    for(let i = 0; i < this.data.length; i++) {

      const factory: ComponentFactory<MarkTypeIconComponent> = this.resolver.resolveComponentFactory(MarkTypeIconComponent);
      const componentRef = this.actualContainer.createComponent(factory);

      const top = this.data[i].coordinates.y;
      const left = this.data[i].coordinates.x;

      this.renderer.setStyle(componentRef.location.nativeElement, 'position', 'absolute');
      this.renderer.setStyle(componentRef.location.nativeElement, 'top', ((top < 0) ? 0:top) + 'px');
      this.renderer.setStyle(componentRef.location.nativeElement, 'left', ((left < 0) ? 0:left) + 'px');

      componentRef.instance.setComponentRef(componentRef);
      componentRef.instance.setIndex(i);
      componentRef.instance.iconName = this.data[i].iconName;
      componentRef.instance.setMarkType(this.data[i].iconType)
      this.markDetails.push(componentRef);
    }
    this.show = true;
  }

  onDropClick(event) {
    console.log(event);
    if(this.selectedIcon) {
      switch (this.selectedIcon.type) {
        case IconTypeEnum.FULL_MARK:
        case IconTypeEnum.HALF_MARK:  this.createMarkIcon(event);
                                      break;
        default:  console.log("No icon type found!");
                  break;
      }

    }
  }

  onControl(control: string) {
    console.log(control);
    switch (control) {
      case 'save':  this.saveMarks();
                    break;
      default:      console.log("No control '" + control + "' found!");
                    break;
    }
  }

  private saveMarks() {
    const markDetails = [];
    for(let i = 0; i < this.markDetails.length; i++) {
      const markType = this.markDetails[i].instance;
      markDetails[i] = { coordinates: markType.getCoordinates(), iconName: markType.iconName, iconType: markType.getMarkType() }
    }
    console.log(markDetails);
  }

  private createMarkIcon(event) {
    const factory: ComponentFactory<MarkTypeIconComponent> = this.resolver.resolveComponentFactory(MarkTypeIconComponent);
    const componentRef = this.actualContainer.createComponent(factory);

    this.renderer.setStyle(componentRef.location.nativeElement, 'position', 'absolute');
    const minWidth = this.markerContainer.nativeElement.scrollWidth - 36;
    const minHeight = this.markerContainer.nativeElement.scrollHeight - 36;

    const top = event.offsetY - 18;
    const left = event.offsetX - 18;

    this.renderer.setStyle(componentRef.location.nativeElement, 'top', ((top < 0) ? 0:((top > minHeight) ? minHeight:top)) + 'px');
    this.renderer.setStyle(componentRef.location.nativeElement, 'left', ((left < 0) ? 0:((left > minWidth) ? minWidth:left)) + 'px');

    const newIndex = this.markDetails.push(componentRef) - 1;
    componentRef.instance.setComponentRef(componentRef);
    componentRef.instance.iconName = this.selectedIcon.icon;
    componentRef.instance.setIndex(newIndex);
    componentRef.instance.setMarkType(this.selectedIcon.type);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
