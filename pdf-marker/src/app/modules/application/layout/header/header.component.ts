import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'pdf-marker-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  @Input()
  appName: string;

  ngOnInit() {
  }

}
