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
import {MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {FileExplorerModalComponent} from "@sharedModule/components/file-explorer-modal/file-explorer-modal.component";
import {YesAndNoConfirmationDialogComponent} from "@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component";


@Component({
  selector: 'pdf-marker-assignment-marking',
  templateUrl: './assignment-marking.component.html',
  styleUrls: ['./assignment-marking.component.scss'],
  providers: []
})
export class AssignmentMarkingComponent implements OnInit, OnDestroy {
  // @ts-ignore
  @ViewChild('container') container: ElementRef;

  // @ts-ignore
  @ViewChild('markerContainer') markerContainer: ElementRef;

  // @ts-ignore
  @ViewChild('pdfViewerAutoLoad') pdfViewerAutoLoad;

  @ViewChild('containerRef', {read: ViewContainerRef, static: false})
  actualContainer: ViewContainerRef;

  show: boolean;
  showSettings: boolean;
  pdfPath :string;
  pdfPages: number = 0;
  currentPage: number = 0;
  private selectedIcon: IconInfo;
  private colour: string;
  private subscription: Subscription;
  private markDetailsComponents: ComponentRef<MarkTypeIconComponent>[] = [];
  private markDetailsRawData: any[] = [];
  constructor(private renderer: Renderer2,
              private assignmentService: AssignmentService,
              private el: ElementRef,
              private dialog: MatDialog,
              private resolver: ComponentFactoryResolver,
              private route: ActivatedRoute,
              private router: Router,
              private appService: AppService) { }

  ngOnInit() {
    if(this.assignmentService.getSelectedPdfURL() === undefined || this.assignmentService.getSelectedPdfURL() === null){
      this.router.navigate(["/marker"]);
    } else {
      this.getAssignmentProgress();
    }

    this.subscription = this.assignmentService.selectedPdfURLChanged().subscribe(pdfPath => {
      if (pdfPath) {
        this.markDetailsComponents.forEach(componentRef => {
          componentRef.destroy();
        });
        this.getAssignmentProgress(true);
      }
    });
  }

  private openPDF() {
    this.pdfPath = this.assignmentService.getSelectedPdfURL();
  }

  private getAssignmentProgress(isSubscription: boolean = false) {
    this.appService.isLoading$.next(true);
    this.assignmentService.getSavedMarks().subscribe((marks: any[]) => {
      this.markDetailsRawData = marks;
      this.openPDF();
      if(isSubscription) {
        this.pdfViewerAutoLoad.pdfSrc = this.pdfPath; // pdfSrc can be Blob or Uint8Array
        this.pdfViewerAutoLoad.refresh();
      }
    }, error => {
      console.log("Error fetching marks");
      this.appService.isLoading$.next(false);
    });
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

  onColourChanged(colour: string) {
    console.log("AM: " + colour);
  }

  onSettings() {

  }

  pagesLoaded(pageNumber) {
    this.pdfPages = pageNumber;
    this.markDetailsComponents = [];
    this.appService.initializeScrollPosition();

    const pdfViewerApplication = this.pdfViewerAutoLoad.PDFViewerApplication;
    this.currentPage = (pdfViewerApplication.page) ? pdfViewerApplication.page:this.pdfViewerAutoLoad.page;
    const observe = new IntersectionObserver((entries) => {
      if(entries[0].isIntersecting === true) {
        const target: any = entries[0].target;
        const pageNumber = parseInt(target.dataset.pageNumber);

        if(!isNaN(pageNumber)) {
          this.currentPage = pageNumber;
        }
      }
    }, {threshold:[0.5]});

    let maxHeight: number = 0;
    for(let i = this.currentPage; i <= this.pdfPages; i++) {
      observe.observe(pdfViewerApplication.pdfViewer.viewer.children[i - 1]);
      maxHeight += parseInt(pdfViewerApplication.pdfViewer.viewer.children[i - 1].style.height.replace("px", ""));
    }

    this.container.nativeElement.style.height = maxHeight + "px";
    this.markerContainer.nativeElement.style.height = maxHeight + "px";

    // Set Marks if exists
    for(let i = 0; i < this.markDetailsRawData.length; i++) {

      const factory: ComponentFactory<MarkTypeIconComponent> = this.resolver.resolveComponentFactory(MarkTypeIconComponent);
      const componentRef = this.actualContainer.createComponent(factory);

      const top = this.markDetailsRawData[i].coordinates.y;
      const left = this.markDetailsRawData[i].coordinates.x;

      this.renderer.setStyle(componentRef.location.nativeElement, 'position', 'absolute');
      this.renderer.setStyle(componentRef.location.nativeElement, 'top', ((top < 0) ? 0:top) + 'px');
      this.renderer.setStyle(componentRef.location.nativeElement, 'left', ((left < 0) ? 0:left) + 'px');

      componentRef.instance.setComponentRef(componentRef);
      componentRef.instance.iconName = this.markDetailsRawData[i].iconName;
      componentRef.instance.setMarkType(this.markDetailsRawData[i].iconType);
      if(this.markDetailsRawData[i].iconType === IconTypeEnum.NUMBER) {
        componentRef.instance.setTotalMark((this.markDetailsRawData[i].totalMark) ? this.markDetailsRawData[i].totalMark:0);
      }
      this.markDetailsComponents.push(componentRef);
    }
    this.show = true;
    this.appService.isLoading$.next(false);
  }

  onPageChanged(pageNumber) {
    console.log(pageNumber);
    this.currentPage = pageNumber;
  }

  onDropClick(event) {
    if(this.selectedIcon) {
      switch (this.selectedIcon.type) {
        case IconTypeEnum.FULL_MARK :
        case IconTypeEnum.HALF_MARK :
        case IconTypeEnum.ACK_MARK  :
        case IconTypeEnum.CROSS     :
        case IconTypeEnum.NUMBER    : this.createMarkIcon(event);
                                      break;
        default:  console.log("No icon type found!");
                  break;
      }
    }
  }

  onControl(control: string) {
    switch (control) {
      case 'save'     :   this.saveMarks();
                          break;
      case 'clearAll' :   this.clearMarks();
                          break;
      case 'settings' :   this.settings();
                          break;
      default:      console.log("No control '" + control + "' found!");
                    break;
    }
  }

  async saveMarks(marks: any[] = null): Promise<boolean> {
    const markDetails = (marks) ? marks:this.getMarksToSave();
    this.appService.isLoading$.next(true);
    return await this.assignmentService.saveMarks(markDetails).toPromise()
      .then(() => {
        this.appService.isLoading$.next(false);
        return true;
      })
      .catch(() => {
        this.appService.isLoading$.next(false);
        return false;
      });
  }

  clearMarks() {
    const markDetails = this.getMarksToSave();
    if(markDetails.length > 0) {
      const title = "Confirm";
      const message = "Are you sure you want to delete all marks and comments for this assignment?";
      this.openYesNoConfirmationDialog(title, message);
    }
  }

  private getMarksToSave(): any[] {
    const markDetails = [];
    this.markDetailsComponents.forEach(markComponent => {
      if(!markComponent.instance.deleted) {
        const markType = markComponent.instance;
        if(markType.getMarkType() === IconTypeEnum.NUMBER) {
          markDetails.push({
            coordinates: markType.getCoordinates(),
            iconName: markType.iconName,
            iconType: markType.getMarkType(),
            totalMark: markType.getTotalMark()
          });
        } else {
          markDetails.push({
            coordinates: markType.getCoordinates(),
            iconName: markType.iconName,
            iconType: markType.getMarkType()
          });
        }
      }
    });
    return markDetails;
  }

  private createMarkIcon(event) {
    const factory: ComponentFactory<MarkTypeIconComponent> = this.resolver.resolveComponentFactory(MarkTypeIconComponent);
    const componentRef = this.actualContainer.createComponent(factory);

    this.renderer.setStyle(componentRef.location.nativeElement, 'position', 'absolute');
    const minWidth = this.markerContainer.nativeElement.scrollWidth - componentRef.instance.dimensions;
    const minHeight = this.markerContainer.nativeElement.scrollHeight - componentRef.instance.dimensions;

    const top = event.offsetY - (componentRef.instance.dimensions / 2);
    const left = event.offsetX -  (componentRef.instance.dimensions / 2);

    this.renderer.setStyle(componentRef.location.nativeElement, 'top', ((top < 0) ? 0:((top > minHeight) ? minHeight:top)) + 'px');
    this.renderer.setStyle(componentRef.location.nativeElement, 'left', ((left < 0) ? 0:((left > minWidth) ? minWidth:left)) + 'px');

    const newIndex = this.markDetailsComponents.push(componentRef) - 1;
    componentRef.instance.setComponentRef(componentRef);
    componentRef.instance.iconName = this.selectedIcon.icon;
    componentRef.instance.setMarkType(this.selectedIcon.type);
  }

  private openYesNoConfirmationDialog(title: string = "Confirm", message: string) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = false;
    dialogConfig.autoFocus = true;
    dialogConfig.width = "400px";
    dialogConfig.maxWidth = "400px";

    dialogConfig.data = {
      title: title,
      message: message,
    };

    this.appService.isLoading$.next(true);
    const dialog = this.dialog.open(YesAndNoConfirmationDialogComponent, dialogConfig);
    dialog.afterOpened().subscribe(() => this.appService.isLoading$.next(false))
    dialog.afterClosed()
      .subscribe((shouldDelete) => {
        if(shouldDelete) {
          this.markDetailsComponents.map(markComponent => markComponent.instance.setIsDeleted(true));
          const markDetails = this.getMarksToSave();
          this.saveMarks(markDetails)
            .then(() => {
              this.markDetailsComponents.forEach(markComponents => {
                markComponents.destroy();
              });
              this.markDetailsRawData = [];
            });
        }
      });
  }

  private settings() {
    this.showSettings = !this.showSettings;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
