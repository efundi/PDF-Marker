import {
  Component,
  ComponentFactory,
  ComponentFactoryResolver,
  ComponentRef,
  ElementRef,
  HostListener,
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
import {YesAndNoConfirmationDialogComponent} from "@sharedModule/components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component";
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";
import {FinaliseMarkingComponent} from "@pdfMarkerModule/components/finalise-marking/finalise-marking.component";
import {MarkingCommentModalComponent} from "@sharedModule/components/marking-comment-modal/marking-comment-modal.component";
import {PageSizes, PDFDocument, PDFPage, rgb} from 'pdf-lib'
import {IconSvgEnum} from "@pdfMarkerModule/info-objects/icon-svg.enum";
import {AnnotationFactory} from 'annotpdf';

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

  showSettings: boolean;
  pdfPath: string;
  isPdfLoaded: boolean;
  show: boolean;
  pdfPages: number = 0;
  currentPage: number = 1;
  assignmentSettings: AssignmentSettingsInfo;
  colour: string = "#6F327A";
  isSelectedIcon: boolean;
  wheelDirection: string;
  isWheel: boolean;
  totalMark: number = 0;
  private selectedIcon: IconInfo;
  private subscription: Subscription;
  private markDetailsComponents: any;
  private markDetailsRawData: any[];
  private readonly defaultFullMark = 1;
  private readonly defaultIncorrectMark = 0;
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
        if(!this.isNullOrUndefined(this.markDetailsComponents)) {
          const pagesArray = Object.keys(this.markDetailsComponents);
          pagesArray.forEach(page => {
            if (Array.isArray(this.markDetailsComponents[page])) {
              this.markDetailsComponents[page].forEach(markComponentRef => {
                markComponentRef.destroy();
              });
            }
          });
        }
        this.currentPage = 1;
        this.getAssignmentProgress(true);
      }
    });
  }

  private openPDF() {
    this.pdfPath = this.assignmentService.getSelectedPdfURL();
  }

  private getAssignmentProgress(isSubscription: boolean = false) {
    this.isPdfLoaded = false;
    this.appService.isLoading$.next(true);
    this.assignmentService.getSavedMarks().subscribe((marks: any[]) => {
      this.markDetailsRawData = marks;
      this.assignmentService.getAssignmentSettings().subscribe((settings: AssignmentSettingsInfo) => {
        this.assignmentSettings = settings;
        if(this.assignmentSettings.defaultColour !== undefined && this.assignmentSettings.defaultColour !== null)
          this.colour = this.assignmentSettings.defaultColour;
        this.openPDF();
        if(isSubscription) {
          this.pdfViewerAutoLoad.pdfSrc = this.pdfPath; // pdfSrc can be Blob or Uint8Array
          this.pdfViewerAutoLoad.refresh();
        }
      }, error => {
        this.appService.isLoading$.next(false);
        console.log(error);
      });
    }, error => {
      console.log("Error fetching marks");
      this.appService.isLoading$.next(false);
    });
  }

  pagesLoaded(pageNumber) {
    this.pdfPages = pageNumber;
    this.markDetailsComponents = [];
    this.appService.initializeScrollPosition();

    const pdfViewerApplication = this.pdfViewerAutoLoad.PDFViewerApplication;
    this.currentPage = (pdfViewerApplication.page) ? pdfViewerApplication.page:this.pdfViewerAutoLoad.page;

    let maxHeight: number = 0;
    let maxWidth: number = 0;
    for(let i = this.currentPage; i <= this.pdfPages; i++) {
      maxHeight += parseInt(pdfViewerApplication.pdfViewer.viewer.children[i - 1].style.height.replace("px", ""));
      if(!maxWidth)
        maxWidth += parseInt(pdfViewerApplication.pdfViewer.viewer.children[i - 1].style.width.replace("px", ""));
    }

    this.container.nativeElement.style.height = (maxHeight / this.pdfPages) + "px";
    this.container.nativeElement.style.width = maxWidth + "px";
    this.markerContainer.nativeElement.style.height = (maxHeight / this.pdfPages) + "px";

    // Set Marks if exists
    if(!this.isNullOrUndefined(this.markDetailsRawData)) {
      const pages = Object.keys(this.markDetailsRawData);
      pages.forEach(page => {
        if (Array.isArray(this.markDetailsRawData[page])) {
          for (let i = 0; i < this.markDetailsRawData[page].length; i++) {
            const factory: ComponentFactory<MarkTypeIconComponent> = this.resolver.resolveComponentFactory(MarkTypeIconComponent);
            const componentRef = this.actualContainer.createComponent(factory);
            this.createMark(componentRef, this.markDetailsRawData[page][i]);

            if (this.markDetailsComponents[page])
              this.markDetailsComponents[page].push(componentRef);
            else
              this.markDetailsComponents[page] = [componentRef];
          }
        }
      });
    }
    this.isPdfLoaded = this.show = true;
    this.appService.isLoading$.next(false);
    this.createPdf();
  }

  isNullOrUndefined(object: any): boolean {
    return (object === null || object === undefined);
  }

  onSelectedIcon(selectedIcon: string) {
    try {
      this.selectedIcon = JSON.parse(selectedIcon);
      this.isSelectedIcon = true;
      this.renderer.addClass(this.markerContainer.nativeElement, 'pdf-marker-dropzone');
    } catch (e) {
      this.isSelectedIcon = false;
      this.selectedIcon = undefined;
      this.renderer.removeClass(this.markerContainer.nativeElement, 'pdf-marker-dropzone');
    }
  }

  onColourChanged(colour: string) {
    this.colour = colour;
  }

  onColourPickerClose(colour: string) {
    if(this.colour !== this.assignmentSettings.defaultColour)
      this.onAssignmentSettings({defaultColour: colour});
  }

  onPaged(pageNumber: number) {
    if(this.currentPage !== pageNumber && !this.isWheel) {
      this.currentPage = pageNumber;
    }
    this.appService.initializeScrollPosition();
    this.pageMarks();
  }

  onPagedChanged(pageNumber: number, isWheel:boolean = false) {
    this.currentPage = pageNumber;
    if(isWheel)
      this.wheelDirection = undefined;
    this.isWheel = isWheel;
  }

  onPageNumberChange(pageNumber: number) {
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

  onMouseWheel(event) {
    event.stopImmediatePropagation();
    event.preventDefault();
    if(event.deltaY < 0 && this.currentPage !== 1 && this.wheelDirection !== "up") {
      this.wheelDirection = "up";
      this.onPagedChanged(this.currentPage - 1, true);
    } else if(event.deltaY > 0 && this.currentPage !== this.pdfPages && this.wheelDirection !== "down") {
      this.wheelDirection = "down";
      this.onPagedChanged(this.currentPage + 1,true);
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
      case 'finalise' :   this.finalise();
                          break;
      case 'prevPage' :   this.onPagedChanged(this.currentPage - 1);
                          break;
      case 'nextPage' :   this.onPagedChanged(this.currentPage + 1);
                          break;
      default         :   console.log("No control '" + control + "' found!");
                          break;
    }
  }

  onAssignmentSettings(settings: AssignmentSettingsInfo) {
    this.appService.isLoading$.next(true);
    this.assignmentService.assignmentSettings(settings).subscribe((assignmentSettings: AssignmentSettingsInfo) => {
      this.assignmentSettings = assignmentSettings;
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.isLoading$.next(false);
    });
  }

  async saveMarks(marks: any[] = null): Promise<boolean> {
    const markDetails = (marks) ? marks:this.getMarksToSave();
    this.appService.isLoading$.next(true);
    return await this.assignmentService.saveMarks(markDetails, this.totalMark).toPromise()
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

    if(!this.isNullOrUndefined(this.markDetailsComponents)) {
      const pagesArray = Object.keys(this.markDetailsComponents);
      pagesArray.forEach(page => {
        if (Array.isArray(this.markDetailsComponents[page])) {
          this.markDetailsComponents[page].forEach(markComponent => {
            if (!markComponent.instance.deleted) {
              const markType = markComponent.instance;
              const markDetailsData: any = {};
              markDetailsData.coordinates = markType.getCoordinates();
              markDetailsData.iconName = markType.getIconName();
              markDetailsData.iconType = markType.getMarkType();
              markDetailsData.totalMark = markType.getTotalMark();
              markDetailsData.colour = markType.getColour();
              markDetailsData.pageNumber = markType.getPageNumber();

              this.totalMark += markType.getTotalMark();

              if (markType.getMarkType() === IconTypeEnum.NUMBER) {
                markDetailsData.sectionLabel = markType.getSectionLabel();
                markDetailsData.comment = markType.getComment();
              }

              if (markDetails[page]) {
                markDetails[page].push(markDetailsData);
              } else {
                markDetails[page] = [markDetailsData];
              }
            }
          });
        }
      });
    }
    return markDetails;
  }

  private createMarkIcon(event) {
    const factory: ComponentFactory<MarkTypeIconComponent> = this.resolver.resolveComponentFactory(MarkTypeIconComponent);
    const componentRef = this.actualContainer.createComponent(factory);
    this.createMark(componentRef, {event: event});
    if(this.markDetailsComponents[this.currentPage - 1])
      this.markDetailsComponents[this.currentPage - 1].push(componentRef);
    else
      this.markDetailsComponents[this.currentPage - 1] = [componentRef];
    if(componentRef.instance.getMarkType() !== IconTypeEnum.NUMBER) {
      this.saveMarks().then((isSaved: boolean) => {
        if (isSaved) {
          this.appService.openSnackBar(true, "Saved");
        } else {
          this.appService.openSnackBar(false, "Unable to save");
          componentRef.instance.setIsDeleted(true);
          componentRef.destroy();
        }
      });
    }
  }

  private createMark(componentRef: ComponentRef<MarkTypeIconComponent>, markTypeIconData = null) {
    const event = markTypeIconData.event;
    const top = (event) ? event.offsetY - (componentRef.instance.dimensions / 2):markTypeIconData.coordinates.y;
    const left = (event) ? event.offsetX -  (componentRef.instance.dimensions / 2):markTypeIconData.coordinates.x;

    this.renderer.setStyle(componentRef.location.nativeElement, 'position', 'absolute');
    this.renderer.setStyle(componentRef.location.nativeElement, 'z-index', 1);
    this.renderer.addClass(componentRef.location.nativeElement, 'pdf-marker-mark-type-icon');
    if(event) {
      const minWidth = this.markerContainer.nativeElement.scrollWidth - componentRef.instance.dimensions;
      const minHeight = this.markerContainer.nativeElement.scrollHeight - componentRef.instance.dimensions;
      this.renderer.setStyle(componentRef.location.nativeElement, 'top', ((top < 0) ? 0 : ((top > minHeight) ? minHeight : top)) + 'px');
      this.renderer.setStyle(componentRef.location.nativeElement, 'left', ((left < 0) ? 0 : ((left > minWidth) ? minWidth : left)) + 'px');
    } else {
      this.renderer.setStyle(componentRef.location.nativeElement, 'top', ((top < 0) ? 0:top) + 'px');
      this.renderer.setStyle(componentRef.location.nativeElement, 'left', ((left < 0) ? 0:left) + 'px');
    }

    componentRef.instance.setAssignmentMarkingRef(this);
    componentRef.instance.setComponentRef(componentRef);
    componentRef.instance.setIconName((event) ? this.selectedIcon.icon:markTypeIconData.iconName);
    componentRef.instance.setColour((event) ? this.colour:markTypeIconData.colour);
    componentRef.instance.setMarkType((event) ? this.selectedIcon.type:markTypeIconData.iconType);
    componentRef.instance.setPageNumber((event) ? this.currentPage:markTypeIconData.pageNumber);
    if(componentRef.instance.getPageNumber() === this.currentPage)
      componentRef.instance.isDisplay = true;

    if(componentRef.instance.getMarkType() === IconTypeEnum.FULL_MARK) {
      componentRef.instance.setTotalMark(this.defaultFullMark);
    } else if(componentRef.instance.getMarkType() === IconTypeEnum.HALF_MARK) {
      componentRef.instance.setTotalMark((this.defaultFullMark / 2));
    } else if(componentRef.instance.getMarkType() === IconTypeEnum.CROSS) {
      componentRef.instance.setTotalMark(this.defaultIncorrectMark);
    } else if (componentRef.instance.getMarkType() === IconTypeEnum.NUMBER) {
      if(event) {
        const config = this.openNewMarkingCommentModal('Marking Comment', '');
        const handelCommentFN = (formData: any) => {
          if (formData.removeIcon) {
            componentRef.instance.setIsDeleted(true);
            componentRef.instance.getComponentRef().destroy();
          } else {
            componentRef.instance.setTotalMark(formData.totalMark);
            componentRef.instance.setSectionLabel(formData.sectionLabel);
            componentRef.instance.setComment(formData.markingComment);
            this.saveMarks().then((isSaved: boolean) => {
              if(isSaved) {
                this.appService.openSnackBar(true, "Saved");
              } else {
                this.appService.openSnackBar(false, "Unable to save");
                componentRef.instance.setIsDeleted(true);
                componentRef.destroy();
              }
            });
          }
        };
        this.appService.createDialog(MarkingCommentModalComponent, config, handelCommentFN);
      } else {
        componentRef.instance.setTotalMark((markTypeIconData.totalMark) ? markTypeIconData.totalMark:0);
        componentRef.instance.setSectionLabel((markTypeIconData.sectionLabel) ? markTypeIconData.sectionLabel:"");
        componentRef.instance.setComment((markTypeIconData.comment) ? markTypeIconData.comment:"");
      }
    }
  }

  private async settings() {
    this.showSettings = !this.showSettings;
  }

  private openYesNoConfirmationDialog(title: string = "Confirm", message: string) {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "400px";
    config.data = {
      title: title,
      message: message,
    };

    const shouldDeleteFn = (shouldDelete: boolean) => {
      if(shouldDelete) {
        if(!this.isNullOrUndefined(this.markDetailsComponents)) {
          const pagesArray = Object.keys(this.markDetailsComponents);
          pagesArray.forEach(page => {
            if (Array.isArray(this.markDetailsComponents[page])) {
              this.markDetailsComponents[page].map(markComponent => markComponent.instance.setIsDeleted(true));
              const markDetails = this.getMarksToSave();
              this.saveMarks(markDetails)
                .then(() => {
                  this.markDetailsComponents[page].forEach(markComponents => {
                    markComponents.destroy();
                  });
                  this.markDetailsRawData = [];
                });
            }
          });
        }
      }
    };
    this.appService.createDialog(YesAndNoConfirmationDialogComponent, config, shouldDeleteFn);
  }

  private pageMarks() {
    if(!this.isNullOrUndefined((this.markDetailsComponents))) {
      const pages = Object.keys(this.markDetailsComponents);
      pages.forEach(page => {
        if (Array.isArray(this.markDetailsComponents[page])) {
          this.markDetailsComponents[page].forEach(markComponent => {
            markComponent.instance.isDisplay = this.currentPage === markComponent.instance.getPageNumber();
          });
        }
      });
    }
  }

  private finalise() {
    const config: MatDialogConfig = new MatDialogConfig();
    config.width = "400px";
    config.height = "500px";
    config.disableClose = true;

    config.data = {
      assignmentPath: this.assignmentService.getSelectedPdfLocation(),
      marks: this.getMarksToSave(),
      defaultTick: this.defaultFullMark,
      incorrectTick: this.defaultIncorrectMark
    };
    this.appService.createDialog(FinaliseMarkingComponent, config);
  }

  private openNewMarkingCommentModal(title: string = "Marking Comment", message: string) {
    const config = new MatDialogConfig();
    config.width = "400px";
    config.maxWidth = "500px";
    config.disableClose = true;
    config.data = {
      title: title,
      message: message,
    };

    return config;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    event.preventDefault();
  }

  // Sample for creating PDF
  private createPdf() {
    let  totalMMarks: number = 0;
    let  generalMarks: number = 0;
    let sectionMarks: string[] = [];
    if(!this.isNullOrUndefined((this.markDetailsComponents))) {
      this.appService.isLoading$.next(true);
      const reader = new FileReader();
      reader.readAsArrayBuffer(this.assignmentService.getSelectedPdfBlob());
      reader.onloadend = async () => {
        const pdfFactory =  new AnnotationFactory(new Uint8Array(reader.result as ArrayBuffer));
        let pdfDoc = await PDFDocument.load(reader.result, { ignoreEncryption: true });
        let pdfPages: PDFPage[] = await pdfDoc.getPages();
        let pageCount: number = 1;
        pdfPages.forEach((pdfPage: PDFPage) => {
          if (Array.isArray(this.markDetailsComponents[pageCount - 1])) {
            this.markDetailsComponents[pageCount - 1].forEach(markComponent => {
              const markObj = markComponent.instance;
              if(!markObj.deleted) {
                const coords = markObj.getCoordinates();
                if(markObj.getMarkType() === IconTypeEnum.NUMBER) {
                    pdfFactory.createTextAnnotation(pageCount - 1, [(coords.x * 72 / 96), pdfPage.getHeight() - (coords.y * 72 / 96) - 24, pdfPage.getWidth() - (coords.y * 72 / 96), pdfPage.getHeight() - (coords.y * 72 / 96)], 'Mark Value: ' + markObj.getTotalMark() + ' Marking Comment: ' + markObj.getComment(), markObj.getSectionLabel());
                    sectionMarks.push( markObj.getSectionLabel() + ' = ' + markObj.getTotalMark());
                    totalMMarks = totalMMarks + markObj.getTotalMark();
                }
              }
            });
          }
          pageCount++;
        });

        pageCount = 1;
        pdfDoc = await PDFDocument.load(pdfFactory.write(), { ignoreEncryption: true });
        pdfPages = await pdfDoc.getPages();
        pdfPages.forEach((pdfPage: PDFPage) => {
          if (Array.isArray(this.markDetailsComponents[pageCount - 1])) {
            this.markDetailsComponents[pageCount - 1].forEach(markComponent => {
              const markObj = markComponent.instance;
              if(!markObj.deleted) {
                const coords = markObj.getCoordinates();
                const options = {
                  x: (coords.x * 72 / 96) + 4,
                  y: pdfPage.getHeight() - (coords.y * 72 / 96),
                  borderColor: rgb(markObj.redColour, markObj.greenColour, markObj.blueColour),
                  color: rgb(markObj.redColour, markObj.greenColour, markObj.blueColour),
                };
                if(markObj.getMarkType() === IconTypeEnum.FULL_MARK) {
                  pdfPage.drawSvgPath(IconSvgEnum.FULL_MARK_SVG, options);
                  generalMarks++;
                } else if(markObj.getMarkType() === IconTypeEnum.HALF_MARK) {
                  generalMarks = generalMarks + 0.5;
                  pdfPage.drawSvgPath(IconSvgEnum.FULL_MARK_SVG, options);
                  pdfPage.drawSvgPath(IconSvgEnum.HALF_MARK_SVG, {
                    x: (coords.x * 72 / 96) + 4,
                    y: pdfPage.getHeight() - (coords.y * 72 / 96),
                    borderWidth: 2,
                    borderColor: rgb(markObj.redColour, markObj.greenColour, markObj.blueColour),
                    color: rgb(markObj.redColour, markObj.greenColour, markObj.blueColour)
                  });
                } else if(markObj.getMarkType() === IconTypeEnum.CROSS) {
                  pdfPage.drawSvgPath(IconSvgEnum.CROSS_SVG, options);
                } else if(markObj.getMarkType() === IconTypeEnum.ACK_MARK) {
                  pdfPage.drawSvgPath(IconSvgEnum.ACK_MARK_SVG, options);
                }
              }
            });
          }
          pageCount++;
        });
        totalMMarks = totalMMarks + generalMarks;

        const resultsPage = pdfDoc.addPage(PageSizes.A4);
        resultsPage.drawText('Results', {x: 250, y: 800});
        resultsPage.drawText("",{x: 250, y: 775});
        resultsPage.drawText('_______________________________________', {x: 25, y: 775});
        resultsPage.drawText("",{x: 250, y: 750});
        let y = 750;
        for(let i = 0; i <= sectionMarks.length -1; i++) {
          y = y - 25;
          resultsPage.drawText(sectionMarks[i] + '', {x: 25, y: y});
          resultsPage.drawText('', {x: 25, y:y});
        }
        y = y - 25;
        resultsPage.drawText('General Marks = ' + generalMarks, {x: 25, y: y});
        y = y - 25;
        resultsPage.drawText('_______________________________________', {x: 25, y:y});
        y = y - 25;
        resultsPage.drawText('', {x: 25, y:y});
        y = y - 25;
        resultsPage.drawText('Total = ' + totalMMarks , {x: 25, y: y});
        const newPdfBytes = await pdfDoc.save();
        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.appService.isLoading$.next(false);
      };

      reader.onerror = () => {
        this.appService.openSnackBar(false, 'Unable to create marked PDF');
        this.appService.isLoading$.next(false);
      }
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
