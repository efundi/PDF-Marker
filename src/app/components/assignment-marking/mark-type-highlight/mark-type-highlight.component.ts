import {AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, Renderer2, ViewChild} from '@angular/core';
import {
  AssignmentMarkingSessionService
} from '../assignment-marking-session.service';
import {Subscription} from 'rxjs';
import {
  AssignmentMarkingPageComponent
} from '../assignment-marking-page/assignment-marking-page.component';
import {MarkInfo} from '@shared/info-objects/mark.info';
import {cloneDeep, find} from 'lodash';
import {MatDialogConfig} from '@angular/material/dialog';
import {AppService} from '../../../services/app.service';
import {
  MarkingHighlightModalComponent
} from '../marking-highlight-modal/marking-highlight-modal.component';
import {HIGHLIGHTER_OPTIONS, HighlighterColor} from '../../../info-objects/highlighter-color';
import {MatMenuTrigger} from '@angular/material/menu';


@Component({
  selector: 'pdf-marker-mark-type-highlight',
  templateUrl: './mark-type-highlight.component.html',
  styleUrls: ['./mark-type-highlight.component.scss']
})
export class MarkTypeHighlightComponent implements OnInit, AfterViewInit, OnDestroy {

  static HIGHLIGHT_HEIGHT = 20;

  @Input()
  mark: MarkInfo;

  @Input()
  index: number;

  private zoomSubscription: Subscription;

  @ViewChild('highlight', {static: true})
  private highlight: ElementRef<HTMLDivElement>;

  @ViewChild('menuTrigger', {static: true})
  private menuTrigger: MatMenuTrigger;

  selectedHighlightColour: HighlighterColor;


  private menuOpenSubscription: Subscription;
  private menuClosedSubscription: Subscription;


  readonly highlightOptions = HIGHLIGHTER_OPTIONS;

  constructor(
    private assignmentMarkingSessionService: AssignmentMarkingSessionService,
    private assignmentMarkingPageComponent: AssignmentMarkingPageComponent,
    private appService: AppService,
    private elementRef: ElementRef,
    private renderer: Renderer2) {

  }

  ngAfterViewInit() {
    this.menuOpenSubscription = this.menuTrigger.menuOpened.subscribe(() => {
      this.renderer.setStyle(this.elementRef.nativeElement, 'z-index', '5');
    });
    this.menuClosedSubscription = this.menuTrigger.menuClosed.subscribe(() => {
      this.renderer.removeStyle(this.elementRef.nativeElement, 'z-index');
    });
    this.render();
  }

  ngOnDestroy() {
    this.zoomSubscription.unsubscribe();
    this.menuOpenSubscription.unsubscribe();
    this.menuClosedSubscription.unsubscribe();
  }

  ngOnInit(): void {
    this.zoomSubscription = this.assignmentMarkingSessionService.zoomChanged.subscribe(() => this.render());
    this.selectedHighlightColour = find(HIGHLIGHTER_OPTIONS, {colour: this.mark.colour});
  }

  private render() {
    const zoom = this.assignmentMarkingSessionService.zoom;

    const left = zoom * this.mark.coordinates.x;
    const top = zoom * this.mark.coordinates.y;
    const width = zoom * this.mark.coordinates.width;
    const height = (zoom * MarkTypeHighlightComponent.HIGHLIGHT_HEIGHT); // +2 for the dotted border


    this.renderer.setStyle(this.elementRef.nativeElement, 'left', (left) + 'px'); // -1 for dotted border
    this.renderer.setStyle(this.elementRef.nativeElement, 'top', (top) + 'px'); // -1 for dotted border
    this.renderer.setStyle(this.highlight.nativeElement, 'width', width + 'px');
    this.renderer.setStyle(this.highlight.nativeElement, 'height', height + 'px');
    this.renderer.setStyle(this.highlight.nativeElement, 'background', this.mark.colour);
  }


  selectHighlighter(highlightOption: HighlighterColor) {
    this.selectedHighlightColour = highlightOption;
    this.assignmentMarkingSessionService.highlighterColour = highlightOption;
    const updatedMark: MarkInfo = cloneDeep(this.mark);
    updatedMark.colour = highlightOption.colour;
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

  /**
   * Callback when the edit button is clicked
   * @param event
   */
  onEdit(event: MouseEvent) {
    event.stopPropagation();

    const config = new MatDialogConfig();
    config.width = '400px';
    config.maxWidth = '500px';
    config.data = {
      comment : {
        markingComment: this.mark.comment,
        sectionLabel: this.mark.sectionLabel
      }
    };

    const handleCommentFN = (formData: any) => {
      if (formData && !formData.removeIcon) {
        const updateMark = cloneDeep(this.mark);
        updateMark.sectionLabel = formData.sectionLabel;
        updateMark.comment = formData.markingComment;
        this.assignmentMarkingPageComponent.onMarkChanged(this.index, updateMark).subscribe(() => {
          this.mark.sectionLabel = updateMark.sectionLabel;
          this.mark.comment = updateMark.comment;
        });
      }
    };
    this.appService.createDialog(MarkingHighlightModalComponent, config, handleCommentFN);
  }
}
