import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ZipService} from "@coreModule/services/zip.service";
import {MatDialog, MatDialogConfig} from "@angular/material";
import {FileExplorerModalComponent} from "@sharedModule/components/file-explorer-modal/file-explorer-modal.component";
import {MatDialogRef} from "@angular/material/dialog/typings/dialog-ref";

@Component({
  selector: 'pdf-marker-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {

  @ViewChild("pdfMarkerUploadDisplay", { static: false })
  pdfMarkerUploadDisplay: ElementRef;

  readonly acceptMimeType = "application/zip";

  private file: File;

  importForm: FormGroup;

  readonly noRubricDefaultValue: boolean = false;

  isRubric: boolean = true;

  isModalOpened: boolean = false;

  private hierarchyModel$ = this.zipService.hierarchyModel$;

  private hierarchyModel;

  private hierarchyModelKeys;

  constructor(private fb: FormBuilder, private zipService: ZipService, private dialog: MatDialog) { }

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
      assignmentName: [null, Validators.required],
      noRubric: [this.noRubricDefaultValue],
      rubric: [null, Validators.required]
    })
  }

  onFileChange(event) {
    if(event.target.files[0] !== undefined) {
      this.file = event.target.files[0];
      this.setFileDetailsAndAssignmentName(event.target.files[0]);
    } else {
      this.setFileDetailsAndAssignmentName(undefined);
    }
  }

  private setFileDetailsAndAssignmentName(file: File) {
    this.file = file;
    this.pdfMarkerUploadDisplay.nativeElement.value = (file) ? file.name:'';
    this.importForm.controls.assignmentName.setValue(file ? this.getAssignmentNameFromFilename(file.name):'');
  }

  private getAssignmentNameFromFilename(filename: string): string {
    console.log(filename);
    const filenameSplit = filename.split("_");
    if(filenameSplit.length > 1)
      return filenameSplit[0];
    else
      return '';
  }

  onRubricChange(event) {
    if(this.importForm.controls.noRubric.value) {
      this.importForm.controls.rubric.setValidators(null);
      this.importForm.controls.rubric.updateValueAndValidity();
      this.isRubric = false;
    } else {
      this.importForm.controls.rubric.setValidators(Validators.required);
      this.importForm.controls.rubric.updateValueAndValidity();
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
}
