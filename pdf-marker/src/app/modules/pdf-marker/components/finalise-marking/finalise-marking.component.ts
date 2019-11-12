import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

@Component({
  selector: 'pdf-marker-finalise-marking',
  templateUrl: './finalise-marking.component.html',
  styleUrls: ['./finalise-marking.component.scss']
})
export class FinaliseMarkingComponent implements OnInit {

  private readonly regEx = /(.*)\((.+)\)/;

  studentDetails: string;

  assignmentMarks: any[] = [];

  constructor(private dialogRef: MatDialogRef<FinaliseMarkingComponent>,
              @Inject(MAT_DIALOG_DATA) config) {
    const assignmentPathSplit = config.assignmentPath.split("/");
    if(assignmentPathSplit.length == 4) {
      const studentDetails = assignmentPathSplit[1];
      if(this.regEx.test(studentDetails)) {
        this.studentDetails = studentDetails;
      }
    }

  }

  ngOnInit() {
  }

  onClose() {
    this.dialogRef.close();
  }

}
