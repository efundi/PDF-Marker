import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material Modules
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatMenuModule} from "@angular/material/menu";
import {MatTooltipModule} from "@angular/material";
import {MatListModule} from "@angular/material/list";
import {MatSidenavModule} from "@angular/material/sidenav";

const SHARED_MODULES = [
  MatToolbarModule,
  MatDividerModule,
  MatIconModule,
  MatButtonModule,
  MatMenuModule,
  MatTooltipModule,
  MatListModule,
  MatSidenavModule
];

const SHARED_COMPONENTS = [];

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  exports: [ ...SHARED_MODULES, ...SHARED_COMPONENTS ]
})
export class SharedModule { }
