import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';

import { SharedModule } from '@sharedModule/shared.module';
import { MenuComponent } from './menu/menu.component';

@NgModule({
  declarations: [HeaderComponent, MenuComponent],
  imports: [
    CommonModule,
    SharedModule
  ],
  exports: [ HeaderComponent ]
})
export class LayoutModule { }
