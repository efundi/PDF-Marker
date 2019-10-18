import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ZipService} from "../../../application/core/services/zip.service";
import {MatDialog, MatDialogConfig} from "@angular/material";
import {FileExplorerModalComponent} from "../../../application/shared/components/file-explorer-modal/file-explorer-modal.component";
import {AlertService} from "../../../application/core/services/alert.service";
import {SakaiService} from "../../../application/core/services/sakai.service";
import {AppService} from "../../../application/core/services/app.service";
import {ImportService} from "@pdfMarkerModule/services/import.service";
import {HttpEventType} from '@angular/common/http';
import {AssignmentService} from "@sharedModule/services/assignment.service";

@Component({
  selector: 'pdf-marker-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {

  readonly acceptMimeType = ["application/zip", "application/x-zip-compressed"];

  readonly isAssignmentName: boolean = true;

  readonly noRubricDefaultValue: boolean = false;

  private hierarchyModel$ = this.zipService.hierarchyModel$;

  private isLoading$ = this.appService.isLoading$;

  private hierarchyModel;

  private hierarchyModelKeys;

  private file: File;

  isFileLoaded: boolean = false;

  importForm: FormGroup;

  isRubric: boolean = true;

  isModalOpened: boolean = false;

  validMime: boolean;

  isValidFormat: boolean;

  constructor(private fb: FormBuilder,
              private zipService: ZipService,
              private dialog: MatDialog,
              private alertService: AlertService,
              private sakaiService: SakaiService,
              private appService: AppService,
              private importService: ImportService,
              private assignmentService: AssignmentService) { }

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
          filename: this.hierarchyModelKeys[0]
        };

        const dialog = this.dialog.open(FileExplorerModalComponent, dialogConfig);
        dialog.afterOpened().subscribe(() => this.isLoading$.next(false))
        dialog.afterClosed()
          .subscribe(() => {
          this.isModalOpened = !this.isModalOpened;

        });
      }
    });

    this.initForm();
    this.isLoading$.next(false);
  }

  private initForm() {
    this.importForm = this.fb.group({
      assignmentZipFile: [null, Validators.required],
      assignmentZipFileText: [null],
      assignmentName: [null],
      noRubric: [this.noRubricDefaultValue],
      rubric: [null, Validators.required]
    });
  }

  onFileChange(event) {
    if(event.target.files[0] !== undefined) {
      this.isLoading$.next(true);
      this.file = event.target.files[0];
      this.validMime = this.isValidMimeType(this.file.type);
      this.setFileDetailsAndAssignmentName(this.file);
    } else {
      this.validMime = false;
      this.setFileDetailsAndAssignmentName(undefined);
    }

    if(this.validMime) {
      this.zipService.isValidZip(this.fc.assignmentName.value, this.file).subscribe((isValidFormat: boolean) => {
        this.isValidFormat = isValidFormat;
        if(!this.isValidFormat)
          this.alertService.error(this.sakaiService.formatErrorMessage);
        else
          this.alertService.clear();
        this.isLoading$.next(false);
        this.isFileLoaded = true;
      }, error => {
        this.alertService.error(error);
        this.isLoading$.next(false);
      })
    }
  }

  private setFileDetailsAndAssignmentName(file: File) {
    this.file = file;
    this.fc.assignmentZipFileText.setValue((file) ? file.name:'');
    this.fc.assignmentName.setValue(file ? this.getAssignmentNameFromFilename(file.name):'');
  }

  private getAssignmentNameFromFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, "");
  }

  private isValidMimeType(type: string): boolean {
    let isValid = this.acceptMimeType.indexOf(type) !== -1;
    if(!isValid) {
      this.alertService.error("Not a valid zip file. Please select a file with a .zip extension!");
      this.isLoading$.next(false);
    }
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

  onPreview() {
    this.isLoading$.next(true);
    this.zipService.getEntries(this.file, true).subscribe();
    this.isModalOpened = !this.isModalOpened;
  }

  onSubmit(event) {

    if(this.importForm.invalid || !this.validMime || !this.isValidFormat) {
      event.target.disabled = true;
      return;
    }

    const {
      noRubric,
      rubric
    } = this.importForm.value;

    const formData: FormData = new FormData();
    formData.append('file', this.file);
    formData.append('noRubric', noRubric);
    formData.append('rubric', rubric);
    this.isLoading$.next(true);
    this.importService.importFile(formData).subscribe((events) => {

      if(events.type === HttpEventType.UploadProgress) {

      } else if(events.type === HttpEventType.Response) {
        this.isLoading$.next(false);
        let response: any = events.body;
        this.alertService.success(response.message);
        this.resetForm();
      }
    }, error => this.isLoading$.next(false));
  }

  private resetForm() {
    this.importForm.reset();
    this.file = undefined;
    this.isFileLoaded= false;
    this.isRubric= true;
    this.isModalOpened = false;
    this.validMime = false;
    this.isValidFormat = false;
    this.fc.noRubric.setValue(this.noRubricDefaultValue);
    this.initForm();
    this.assignmentService.getAssignments().subscribe(assignments => {
      this.assignmentService.update(assignments);
    });
  }
}
