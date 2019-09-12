import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';

import { SharedModule } from '@sharedModule/shared.module';

@NgModule({
  declarations: [HeaderComponent],
  imports: [
    CommonModule,
    SharedModule
  ],
  exports: [ HeaderComponent ]
})
export class LayoutModule { }
