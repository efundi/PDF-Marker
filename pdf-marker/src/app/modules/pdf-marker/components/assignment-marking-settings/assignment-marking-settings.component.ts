import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'pdf-marker-assignment-marking-settings',
  templateUrl: './assignment-marking-settings.component.html',
  styleUrls: ['./assignment-marking-settings.component.scss']
})
export class AssignmentMarkingSettingsComponent implements OnInit {

  readonly colours: string[] = ["#FB0201", "#02CB00", "#029BFF", "#FCFC01"];
  readonly colorPickerWidth: number = 25;
  readonly colorPickerHeight: number = 25;

  readonly colorBlockWidth = this.colorPickerWidth / 2;
  readonly colorBlockHeight = this.colorPickerHeight / 2;

  @Output()
  colour: EventEmitter<string> = new EventEmitter<string>();

  settingsForm: FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.settingsForm = this.fb.group({
      defaultTick: [1, [Validators.required]],
      incorrectTick: [0, [Validators.required]]
    });
  }

  onColourChange(colour: string) {
    console.log(colour);
    this.colour.emit(colour)
  }

  onSave() {

  }

}
