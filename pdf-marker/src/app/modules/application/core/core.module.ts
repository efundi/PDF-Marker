import {NgModule, Optional, SkipSelf} from '@angular/core';
import { CommonModule } from '@angular/common';
import {ZipService} from "@coreModule/services/zip.service";
import {AlertService} from "@coreModule/services/alert.service";



@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [ ZipService, AlertService ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if(parentModule) {
      throw new Error(`CoreModule has already been loaded. Only import module in the AppModule only.`);
    }
  }
}
