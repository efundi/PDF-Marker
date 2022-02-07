import {Directive, Input, OnDestroy, OnInit} from '@angular/core';
import {
  AssignmentMarkingSessionService
} from '@pdfMarkerModule/components/assignment-marking/assignment-marking-session.service';
import {Subscription} from 'rxjs';

@Directive({
  selector: '[zoomScrollPosition]'
})
export class ZoomScrollPositionDirective implements OnInit, OnDestroy {

  @Input()
  scrollTarget = 'mat-sidenav-content';

  @Input()
  currentPage = 1;

  private zoomSubscription: Subscription;

  constructor(private assignmentMarkingSessionService: AssignmentMarkingSessionService) {
  }


  ngOnDestroy() {
    this.zoomSubscription.unsubscribe();
  }

  ngOnInit() {
    // Problem we have here is that we can only adjust the zoom after all pages have assumed their new size
    this.zoomSubscription = this.assignmentMarkingSessionService.zoomChanged.subscribe((zoomChangeEvent) => {
      // When the zoom changes we have to adjust the scroll position
      const element = document.querySelector(this.scrollTarget);
      // Offset to add to each page (paddings/margins/borders)
      const PAGE_Y_OFFSET = 19 * this.currentPage;

      const previousZoom = zoomChangeEvent.previous;
      const currentZoom = zoomChangeEvent.current;

      const scrollTop = ((element.scrollTop - PAGE_Y_OFFSET) / previousZoom) * currentZoom;
      const x =  (element.scrollWidth - element.clientWidth) - element.scrollLeft;
      const scrollLeft = (x / previousZoom) *  currentZoom * 2;
      element.scrollTo(scrollLeft, scrollTop + PAGE_Y_OFFSET);
    });
  }
}
