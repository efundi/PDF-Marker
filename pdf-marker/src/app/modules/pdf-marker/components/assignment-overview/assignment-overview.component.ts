import { Component, OnInit } from '@angular/core';
export interface AssignmentDetails {
  studentName: string;
  studentNumber: string;
  assignment: string;
  feedback: string;
  grade: number;
}

const ELEMENT_DATA: AssignmentDetails[] = [
  { studentName: 'Jonty testing der June', studentNumber: '0000000047', assignment: 'my assign rtgd.pdf', feedback: 'my assign rtgd.pdf', grade: 86 },
  { studentName: 'Micheala Or', studentNumber: '0000000048', assignment: 'Essay 4rthfy Michel.pdf', feedback: 'Essay 4rthfy Michel.pdf', grade: 86 },
  { studentName: 'Louisa van der Linden', studentNumber: '0000000049', assignment: 'vd Linden essay on abc.pdf', feedback: 'vd Linden essay on abc.pdf', grade: 0 }
];

@Component({
  selector: 'pdf-marker-assignment-overview',
  templateUrl: './assignment-overview.component.html',
  styleUrls: ['./assignment-overview.component.scss']
})
export class AssignmentOverviewComponent implements OnInit {
  displayedColumns: string[] = ['studentName', 'assignment', 'feedback', 'grade'];
  elementCount: number = ELEMENT_DATA.length;
  dataSource = ELEMENT_DATA;
  assignmentName: string = 'Assignment Name';
  constructor() { }

  ngOnInit() {
  }

}
