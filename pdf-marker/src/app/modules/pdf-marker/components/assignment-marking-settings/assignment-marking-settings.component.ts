import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {AssignmentSettingsInfo} from "@pdfMarkerModule/info-objects/assignment-settings.info";

@Component({
  selector: 'pdf-marker-assignment-marking-settings',
  templateUrl: './assignment-marking-settings.component.html',
  styleUrls: ['./assignment-marking-settings.component.scss']
})
export class AssignmentMarkingSettingsComponent implements OnInit, OnChanges {

  readonly colours: string[] = ["#FB0201", "#02CB00", "#029BFF", "#6F327A"];
  readonly colorPickerWidth: number = 25;
  readonly colorPickerHeight: number = 25;

  readonly colorBlockWidth: number = this.colorPickerWidth / 2;
  readonly colorBlockHeight: number = this.colorPickerHeight / 2;

  private readonly defaultTickValue: number = 1;
  private readonly incorrectTickValue: number = 0;

  private readonly digitPatten = /^(-)?[0-9]+$/;

  private readonly defaultColour = "#6F327A";

  selectedColour: string = this.defaultColour;

  @Output()
  colour: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  settingsOut: EventEmitter<AssignmentSettingsInfo> = new EventEmitter<AssignmentSettingsInfo>();

  @Input()
  settingsIn: any;

  private readonly defaultSettings: AssignmentSettingsInfo = {
    defaultColour: this.defaultColour,
    defaultTick: this.defaultTickValue,
    incorrectTick: this.incorrectTickValue
  };

  settingsForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.settingsIn = this.defaultSettings;
  }

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    if(!!this.settingsIn) {
      this.settingsForm = this.fb.group({
        defaultColour: [(this.settingsIn.defaultColour) ? this.settingsIn.defaultColour:this.defaultColour],
        defaultTick: [(this.settingsIn.defaultTick) ? this.settingsIn.defaultTick:this.defaultTickValue, [Validators.required, Validators.pattern(this.digitPatten)]],
        incorrectTick: [(this.settingsIn.incorrectTick) ? this.settingsIn.incorrectTick:this.incorrectTickValue, [Validators.required,  Validators.pattern(this.digitPatten)]]
      });

      this.selectedColour = (this.settingsIn.defaultColour) ? this.settingsIn.defaultColour:this.defaultColour;
    } else {
      this.settingsForm = this.fb.group({
        defaultColour: [this.defaultColour],
        defaultTick: [this.defaultTickValue, [Validators.required, Validators.pattern(this.digitPatten)]],
        incorrectTick: [this.incorrectTickValue, [Validators.required,  Validators.pattern(this.digitPatten)]]
      });
    }
  }

  onColourChange(colour: string) {
    this.colour.emit(colour);
    this.settingsForm.controls.defaultColour.setValue(colour);
  }

  onDefaultTickChange() {
    const defaultTick = parseInt(this.settingsForm.controls.defaultTick.value);
    if(!isNaN(defaultTick)) {
      if(defaultTick < this.defaultTickValue)
        this.settingsForm.controls.defaultTick.setValue(this.defaultTickValue);
      else
        this.settingsForm.controls.defaultTick.setValue(defaultTick);
    } else {
      this.settingsForm.controls.defaultTick.setValue(this.defaultTickValue);
    }
  }

  onIncorrectTickChange() {
    const incorrectTick = parseInt(this.settingsForm.controls.incorrectTick.value);
    if(!isNaN(incorrectTick)) {
      if(incorrectTick > this.incorrectTickValue)
        this.settingsForm.controls.incorrectTick.setValue(this.incorrectTickValue);
      else
        this.settingsForm.controls.incorrectTick.setValue(incorrectTick);
    } else {
      this.settingsForm.controls.incorrectTick.setValue(this.incorrectTickValue);
    }
  }

  onSave() {
    if(!!this.settingsIn) {
      if (JSON.stringify(this.settingsForm.value) !== JSON.stringify(this.settingsIn))
        this.settingsOut.emit(this.settingsForm.value);
    } else {
      if (JSON.stringify(this.settingsForm.value) !== JSON.stringify(this.defaultSettings))
        this.settingsOut.emit(this.settingsForm.value);
    }
  }

  ngOnChanges() {
    console.log(this.settingsIn);
    this.initForm();
  }

}
