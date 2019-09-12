import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import {MatDividerModule} from "@angular/material/divider";

const SHARED_MODULES = [
  MatToolbarModule,
  MatDividerModule
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
