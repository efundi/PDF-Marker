import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from "@angular/router";
import {FormsModule} from "@angular/forms";
import {ReactiveFormsModule} from "@angular/forms";

// Shared Components
import { FileExplorerComponent } from './components/file-explorer/file-explorer.component';

// Angular Material Modules
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatMenuModule} from "@angular/material/menu";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatListModule} from "@angular/material/list";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatInputModule} from "@angular/material/input";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatSelectModule} from "@angular/material/select";
import {MatExpansionModule} from '@angular/material/expansion';


const SHARED_MODULES = [
  MatToolbarModule,
  MatDividerModule,
  MatIconModule,
  MatButtonModule,
  MatMenuModule,
  MatTooltipModule,
  MatListModule,
  MatSidenavModule,
  MatInputModule,
  MatCheckboxModule,
  MatSelectModule,
  MatExpansionModule,
  RouterModule,
  FormsModule,
  ReactiveFormsModule
];

const SHARED_COMPONENTS = [FileExplorerComponent];

@NgModule({
  declarations: [FileExplorerComponent],
  imports: [
    CommonModule,
    MatIconModule,
    MatExpansionModule
  ],
  exports: [ ...SHARED_MODULES, ...SHARED_COMPONENTS ]
})
export class SharedModule { }
