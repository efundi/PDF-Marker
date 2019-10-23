import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AssignmentService} from "@sharedModule/services/assignment.service";
import {Subscription} from "rxjs";
import {ActivatedRoute, Router} from "@angular/router";


@Component({
  selector: 'pdf-marker-assignment-marking',
  templateUrl: './assignment-marking.component.html',
  styleUrls: ['./assignment-marking.component.scss'],
  providers: []
})
export class AssignmentMarkingComponent implements OnInit, OnDestroy {
  pdfPath :string;
  private subscription: Subscription;
  constructor(  private assignmentService: AssignmentService,
                private route: ActivatedRoute,
                private router: Router) { }

  // @ts-ignore
  @ViewChild('pdfViewerAutoLoad') pdfViewerAutoLoad;

  openPDF()
  {
    this.pdfPath = this.assignmentService.getSelectedPDF()
    console.log("marking" + this.pdfPath);
  }

  ngOnInit() {
    if(!this.assignmentService.getSelectedPDF()){
      this.router.navigate(["/marker"]);
    }
    this.openPDF();
    this.subscription = this.assignmentService.selectedPDFChanged().subscribe(pdfPath => {
      if(this.pdfPath) {
        this.pdfPath = pdfPath;
        console.log(this.pdfPath)
        this.pdfViewerAutoLoad.pdfSrc = this.pdfPath; // pdfSrc can be Blob or Uint8Array
        this.pdfViewerAutoLoad.refresh(); // Ask pdf viewer to load/refresh pdf
      }

    });
}



  onDragEnded(event) {
    console.log(event.source.getRootElement().getBoundingClientRect());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  // dragMoveListener(event) {
  //   var target = event.target,
  //     // keep the dragged position in the data-x/data-y attributes
  //     x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
  //     y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

  //   // translate the element
  //   target.style.webkitTransform =
  //     target.style.transform =
  //     'translate(' + x + 'px, ' + y + 'px)';

  //   // update the posiion attributes
  //   target.setAttribute('data-x', x);
  //   target.setAttribute('data-y', y);
  // }

}
