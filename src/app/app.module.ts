import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HeaderComponent} from './components/header/header.component';
import {MenuComponent} from './components/menu/menu.component';
import {FileExplorerModalComponent} from './components/file-explorer-modal/file-explorer-modal.component';
import {AlertComponent} from './components/alert/alert.component';
import {SideNavigationComponent} from './components/side-navigation/side-navigation.component';
import {
  YesAndNoConfirmationDialogComponent
} from './components/yes-and-no-confirmation-dialog/yes-and-no-confirmation-dialog.component';
import {MarkingCommentModalComponent} from './components/marking-comment-modal/marking-comment-modal.component';
import {SnackBarComponent} from './components/snack-bar/snack-bar.component';
import {RubricViewMarkingComponent} from './components/rubric-view-marking/rubric-view-marking.component';
import {RubricCriteriaComponent} from './components/rubric-criteria/rubric-criteria.component';
import {RubricComponent} from './components/rubric/rubric.component';
import {MarkingHighlightModalComponent} from './components/marking-highlight-modal/marking-highlight-modal.component';
import {AssignmentListComponent} from './components/assignment-list/assignment-list.component';
import {
  RubricCriteriaLevelBlockComponent
} from './components/rubric-criteria-level-block/rubric-criteria-level-block.component';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatListModule} from '@angular/material/list';
import {MatDividerModule} from '@angular/material/divider';
import {MatToolbarModule} from '@angular/material/toolbar';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatOptionModule} from '@angular/material/core';
import {MatSelectModule} from '@angular/material/select';
import {MatRadioModule} from '@angular/material/radio';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {
  AssignmentWorkspaceManageModalComponent
} from './components/assignment-workspace-manage-modal/assignment-workspace-manage-modal.component';
import {
  AssignmentWorkspaceOverviewComponent
} from './components/assignment-workspace-overview/assignment-workspace-overview.component';
import {CreateAssignmentComponent} from './components/create-assignment/create-assignment.component';
import {FinaliseMarkingComponent} from './components/finalise-marking/finalise-marking.component';
import {GenericCommentsComponent} from './components/comments/comments.component';
import {IconsComponent} from './components/icons/icons.component';
import {RubricImportComponent} from './components/rubric-import/rubric-import.component';
import {WorkingFolderComponent} from './components/working-folder/working-folder.component';
import {AssignmentMarkingPageComponent} from './components/assignment-marking-page/assignment-marking-page.component';
import {ScrollSpyDirective} from './directives/scroll-spy.directive';
import {MarkTypeHighlightComponent} from './components/mark-type-highlight/mark-type-highlight.component';
import {ScrollVisibilityDirective} from './directives/scroll-visibility.directive';
import {AssignmentMarkingComponent} from './components/assignment-marking/assignment-marking.component';
import {AssignmentOverviewComponent} from './components/assignment-overview/assignment-overview.component';
import {ImportComponent} from './components/import/import.component';
import {MarkTypeIconComponent} from './components/mark-type-icon/mark-type-icon.component';
import {SettingsComponent} from './components/settings/settings.component';
import {WelcomeComponent} from './components/welcome/welcome.component';
import {ColorPickerModule} from 'ngx-color-picker';
import {RxReactiveFormsModule} from '@rxweb/reactive-form-validators';
import {HomeComponent} from './components/home/home.component';
import {RubricViewModalComponent} from './components/rubric-view-modal/rubric-view-modal.component';
import {MatDialogModule} from '@angular/material/dialog';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBarModule} from '@angular/material/snack-bar';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatMenuModule} from '@angular/material/menu';
import {HttpClientModule} from '@angular/common/http';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatTableModule} from '@angular/material/table';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatSortModule} from '@angular/material/sort';
import {CdkTreeModule} from '@angular/cdk/tree';
import {MatTreeModule} from '@angular/material/tree';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    MenuComponent,
    FileExplorerModalComponent,
    AlertComponent,
    AssignmentListComponent,
    SideNavigationComponent,
    YesAndNoConfirmationDialogComponent,
    MarkingCommentModalComponent,
    SnackBarComponent,
    RubricViewModalComponent,
    RubricCriteriaLevelBlockComponent,
    RubricViewMarkingComponent,
    RubricCriteriaComponent,
    RubricComponent,
    MarkingHighlightModalComponent,
    AssignmentMarkingComponent,
    AssignmentOverviewComponent,
    AssignmentWorkspaceManageModalComponent,
    AssignmentWorkspaceOverviewComponent,
    CreateAssignmentComponent,
    FinaliseMarkingComponent,
    GenericCommentsComponent,
    HomeComponent,
    ImportComponent,
    IconsComponent,
    MarkTypeIconComponent,
    RubricImportComponent,
    SettingsComponent,
    WelcomeComponent,
    WorkingFolderComponent,
    AssignmentMarkingPageComponent,
    ScrollSpyDirective,
    MarkTypeHighlightComponent,
    ScrollVisibilityDirective,
  ],
  imports: [
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    ColorPickerModule,
    RxReactiveFormsModule,
    MatSidenavModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatExpansionModule,
    MatListModule,
    MatDividerModule,
    MatToolbarModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    MatCheckboxModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    MatRadioModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTreeModule,
    DragDropModule,
    CdkTreeModule
  ],
  providers: [
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 } },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
