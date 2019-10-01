import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ZipService} from "@coreModule/services/zip.service";
import {MatDialog, MatDialogConfig} from "@angular/material";
import {FileExplorerModalComponent} from "@sharedModule/components/file-explorer-modal/file-explorer-modal.component";
import {MatDialogRef} from "@angular/material/dialog/typings/dialog-ref";
import {AlertService} from "@coreModule/services/alert.service";

@Component({
  selector: 'pdf-marker-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {

  @ViewChild("pdfMarkerUploadDisplay", { static: false })
  pdfMarkerUploadDisplay: ElementRef;

  readonly acceptMimeType = ["application/zip", "application/x-zip-compressed"];

  private file: File;

  importForm: FormGroup;

  readonly noRubricDefaultValue: boolean = false;

  isRubric: boolean = true;

  isModalOpened: boolean = false;

  readonly isAssignmentName: boolean = true;

  private hierarchyModel$ = this.zipService.hierarchyModel$;

  private hierarchyModel;

  private hierarchyModelKeys;

  errorMessage: string;

  validMime: boolean;

  constructor(private fb: FormBuilder,
              private zipService: ZipService,
              private dialog: MatDialog,
              private alertService: AlertService) { }

  ngOnInit() {
    this.hierarchyModel$.subscribe(value => {
      if(value !== null && value !== undefined) {
        this.hierarchyModel = value;
        this.hierarchyModelKeys = Object.keys(this.hierarchyModel);

        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.autoFocus = true;
        dialogConfig.height = '400px';
        dialogConfig.width = '600px';

        dialogConfig.data = {
          hierarchyModel: this.hierarchyModel,
          hierarchyModelKeys : this.hierarchyModelKeys,
          filename: this.file.name
        };

        this.dialog.open(FileExplorerModalComponent, dialogConfig).afterClosed()
          .subscribe(() => {
          this.isModalOpened = !this.isModalOpened;
        });
      }
    });

    this.initForm();
  }

  private initForm() {
    this.importForm = this.fb.group({
      assignmentZipFile: [null, Validators.required],
      assignmentName: [null],
      noRubric: [this.noRubricDefaultValue],
      rubric: [null, Validators.required]
    });
  }

  onFileChange(event) {
    if(event.target.files[0] !== undefined) {
      this.file = event.target.files[0];
      this.validMime = this.isValidMimeType(this.file.type);
      this.setFileDetailsAndAssignmentName(event.target.files[0]);
    } else {
      this.setFileDetailsAndAssignmentName(undefined);
    }
  }

  private setFileDetailsAndAssignmentName(file: File) {
    this.file = file;
    this.pdfMarkerUploadDisplay.nativeElement.value = (file) ? file.name:'';
    this.fc.assignmentName.setValue(file ? this.getAssignmentNameFromFilename(file.name):'');
  }

  private getAssignmentNameFromFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, "");
  }

  private isValidMimeType(type: string): boolean {
    let isValid = this.acceptMimeType.indexOf(type) !== -1;
    if(!isValid)
      this.alertService.error("Not a valid zip file. Please select a file with a .zip extension!");
    else
      this.alertService.clear();
    return isValid;
  }

  get fc() {
    return this.importForm.controls;
  }

  onRubricChange(event) {
    if(this.fc.noRubric.value) {
      this.fc.rubric.setValidators(null);
      this.fc.rubric.updateValueAndValidity();
      this.isRubric = false;
    } else {
      this.fc.rubric.setValidators(Validators.required);
      this.fc.rubric.updateValueAndValidity();
    }

    this.importForm.updateValueAndValidity();
  }

  isFilePresent(): boolean {
    return !!(this.file);
  }

  onPreview() {
    this.zipService.getEntries(this.file).subscribe();
    this.isModalOpened = !this.isModalOpened;
  }

  acceptTypes(): string {
    return this.acceptMimeType.join(",");
  }

  onSubmit(event) {
    if(this.importForm.invalid || !this.validMime) {
      event.target.disabled = true;
      return;
    }

    console.log(this.importForm.value);
  }
}
