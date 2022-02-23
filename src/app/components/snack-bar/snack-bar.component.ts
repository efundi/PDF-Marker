import {Component, Inject, OnInit} from '@angular/core';
import {MAT_SNACK_BAR_DATA} from '@angular/material/snack-bar';

@Component({
  selector: 'pdf-marker-snack-bar',
  templateUrl: './snack-bar.component.html',
  styleUrls: ['./snack-bar.component.scss']
})
export class SnackBarComponent implements OnInit {
  isShow: boolean;
  isSuccessful: boolean;
  message: string;

  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: any) {
    if (!!data) {
      this.isSuccessful = (data.isSuccessful) ? data.isSuccessful : false;
      this.message = (data.message) ? data.message : undefined;
      this.isShow = true;
    } else {
      this.isShow = false;
    }
  }

  ngOnInit() {
  }

}
