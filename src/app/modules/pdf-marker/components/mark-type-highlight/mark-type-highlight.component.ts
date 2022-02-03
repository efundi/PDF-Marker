import {AfterViewInit, Component, ElementRef, Input, OnInit, Renderer2, ViewChild} from '@angular/core';
import {
  AssignmentMarkingSessionService
} from '@pdfMarkerModule/components/assignment-marking/assignment-marking-session.service';
import {Subscription} from 'rxjs';
import {
  AssignmentMarkingPageComponent
} from '@pdfMarkerModule/components/assignment-marking-page/assignment-marking-page.component';
import {MarkInfo} from '@sharedModule/info-objects/mark.info';
import {cloneDeep} from 'lodash-es';


@Component({
  selector: 'pdf-marker-mark-type-highlight',
  templateUrl: './mark-type-highlight.component.html',
  styleUrls: ['./mark-type-highlight.component.scss']
})
export class MarkTypeHighlightComponent implements OnInit, AfterViewInit {

  static HIGHLIGHT_HEIGHT = 20;

  @Input()
  mark: MarkInfo;

  @Input()
  index: number;

  private zoomSubscription: Subscription;

  @ViewChild('highlight', {static: true})
  private highlight: ElementRef<HTMLDivElement>;

  selectedHighlightColour: any;

  readonly highlightOptions = [
    'rgba(255, 255, 0, 0.5)',
    'rgba(0, 255, 0, 0.5)',
    'rgba(0, 255, 255, 0.5)',
    'rgba(255, 0, 0, 0.5)'
  ];


  constructor(
    private assignmentMarkingSessionService: AssignmentMarkingSessionService,
    private assignmentMarkingPageComponent: AssignmentMarkingPageComponent,
    private elementRef: ElementRef,
    private renderer: Renderer2) {

  }

  ngAfterViewInit() {
    this.render();
  }

  ngOnInit(): void {
    this.zoomSubscription = this.assignmentMarkingSessionService.zoomChanged.subscribe(() => this.render());
  }

  private render() {
    const zoom = this.assignmentMarkingSessionService.zoom;

    const left = zoom * this.mark.coordinates.x;
    const top = zoom * this.mark.coordinates.y;
    const width = zoom * this.mark.coordinates.width;
    const height = (zoom * MarkTypeHighlightComponent.HIGHLIGHT_HEIGHT) + 2; // +2 for the dotted border

    this.renderer.setStyle(this.elementRef.nativeElement, 'left', left + 'px');
    this.renderer.setStyle(this.elementRef.nativeElement, 'top', top + 'px');
    this.renderer.setStyle(this.highlight.nativeElement, 'width', width + 'px');
    this.renderer.setStyle(this.highlight.nativeElement, 'height', height + 'px');
    this.renderer.setStyle(this.highlight.nativeElement, 'background', this.mark.colour);
  }


  selectHighlighter(highlightOption: string) {
    this.selectedHighlightColour = highlightOption;
    this.assignmentMarkingSessionService.highlighterColour = highlightOption;
    const updatedMark: MarkInfo = cloneDeep(this.mark);
    updatedMark.colour = highlightOption;
    this.assignmentMarkingPageComponent.onMarkChanged(this.index, updatedMark).subscribe(
      {
        next : () => {
          this.mark.colour = updatedMark.colour;
          this.render();
        },
        error: () => {
          // Do nothing
        }}
    );
  }

  /**
   * Callback when the remove button is clicked
   * @param event
   */
  onRemove(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.assignmentMarkingPageComponent.onMarkChanged(this.index, null).subscribe();
  }
}
