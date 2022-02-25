import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {CreateAssignmentComponent} from './components/create-assignment/create-assignment.component';
import {
  AssignmentWorkspaceOverviewComponent
} from './components/assignment-workspace-overview/assignment-workspace-overview.component';
import {GenericCommentsComponent} from './components/comments/comments.component';
import {WelcomeComponent} from './components/welcome/welcome.component';
import {AssignmentMarkingComponent} from './components/assignment-marking/assignment-marking.component';
import {ImportComponent} from './components/import/import.component';
import {UnsavedChangesGuard} from './guards/unsaved-changes.guard';
import {AssignmentOverviewComponent} from './components/assignment-overview/assignment-overview.component';
import {SettingsComponent} from './components/settings/settings.component';
import {WorkingFolderComponent} from './components/working-folder/working-folder.component';
import {RubricImportComponent} from './components/rubric-import/rubric-import.component';


const routes: Routes = [
  { path: '', redirectTo: '/marker', pathMatch: 'full' },
  { path: 'marker', component: WelcomeComponent },
  { path: 'marker/assignment/settings', component: SettingsComponent },
  { path: 'marker/assignment/import', component: ImportComponent },
  { path: 'marker/assignment/upload', component: CreateAssignmentComponent },
  { path: 'marker/assignment/upload/:id', component: CreateAssignmentComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'marker/assignment/upload/:id/:workspaceName', component: CreateAssignmentComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'marker/assignment/overview/:id', component: AssignmentOverviewComponent },
  { path: 'marker/assignment/overview/:id/:workspaceName', component: AssignmentOverviewComponent },
  { path: 'marker/assignment/workspaceOverview/:workspaceName', component: AssignmentWorkspaceOverviewComponent },
  { path: 'marker/assignment/workingFolder', component: WorkingFolderComponent },
  { path: 'marker/assignment/marking/:workspaceName/:assignmentName/:student/:pdf', component: AssignmentMarkingComponent },
  { path: 'marker/assignment/rubric', component: RubricImportComponent },
  { path: 'marker/assignment/comments', component: GenericCommentsComponent },
  { path: '**', redirectTo: '', pathMatch: 'full'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
