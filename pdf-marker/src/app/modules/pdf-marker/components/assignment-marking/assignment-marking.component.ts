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


@Component({
  selector: 'pdf-marker-assignment-marking',
  templateUrl: './assignment-marking.component.html',
  styleUrls: ['./assignment-marking.component.scss'],
  providers: []
})
export class AssignmentMarkingComponent implements OnInit, OnDestroy {
  @ViewChild('container', {static: false})
  container: ElementRef;

  private minWidth: number;
  private minHeight: number;

  pdfPath :string;

  // @ts-ignore
  @ViewChild('pdfViewerAutoLoad') pdfViewerAutoLoad;

  @ViewChild('containerRef', {read: ViewContainerRef, static: false})
  actualContainer: ViewContainerRef;

  private selectedIcon: string;
  private subscription: Subscription;

  constructor(private renderer: Renderer2,
              private assignmentService: AssignmentService,
              private el: ElementRef,
              private resolver: ComponentFactoryResolver,
              private route: ActivatedRoute,
              private router: Router) { }

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
      }
    });
  }

  private openPDF() {
    this.pdfPath = this.assignmentService.getSelectedPdfURL();
  }

  onSelectedIcon(selectedIcon: string) {
    this.selectedIcon = selectedIcon;
    if(this.selectedIcon) {
      console.log("Selected Icon is ", selectedIcon);
      this.renderer.addClass(this.container.nativeElement, 'pdf-marker-dropzone');
    } else {
      console.log('None selected');
      this.renderer.removeClass(this.container.nativeElement, 'pdf-marker-dropzone');
    }
  }

  onDropClick(event) {
    console.log(event);
    if(this.selectedIcon) {
      const factory: ComponentFactory<MarkTypeIconComponent> = this.resolver.resolveComponentFactory(MarkTypeIconComponent);
      const componentRef = this.actualContainer.createComponent(factory);
      componentRef.instance.iconName = this.selectedIcon;
      componentRef.instance.setComponentRef(componentRef);
      this.renderer.setStyle(componentRef.location.nativeElement, 'position', 'absolute');

      const minWidth = this.container.nativeElement.scrollWidth - 36;
      const minHeight = this.container.nativeElement.scrollHeight - 36;

      const top = event.offsetY - 18;
      const left = event.offsetX - 18;

      console.log(minHeight);
      console.log(minWidth);
      console.log(this.container.nativeElement.scrollHeight);
      console.log(this.container.nativeElement.scrollWidth);
      console.log('Top: ' + top);
      console.log('Left: ' + left);

      this.renderer.setStyle(componentRef.location.nativeElement, 'top', ((top < 0) ? 0:((top > minHeight) ? minHeight:top)) + 'px');
      this.renderer.setStyle(componentRef.location.nativeElement, 'left', ((left < 0) ? 0:((left > minWidth) ? minWidth:left)) + 'px');
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
