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
import {IRubricName} from "@coreModule/utils/rubric.class";
import {AppSelectedPathInfo} from "@coreModule/info-objects/app-selected-path.info";
import {ElectronService} from "@coreModule/services/electron.service";
import {MimeTypesEnum} from "@coreModule/utils/mime.types.enum";

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

  private hierarchyModel;

  private hierarchyModelKeys;

  private file: File;

  isFileLoaded: boolean = false;

  importForm: FormGroup;

  isRubric: boolean = true;

  isModalOpened: boolean = false;

  validMime: boolean;

  isValidFormat: boolean;

  rubrics: IRubricName[];

  workspaces: String[];

  private actualFilePath: string;
  assignmentTypeID = "Assignment";
  assignmentTypes = [
    { 'name' : 'Assignment'},
    { 'name' : 'Generic'},]
  selectedType: string;

  constructor(private fb: FormBuilder,
              private zipService: ZipService,
              private dialog: MatDialog,
              private alertService: AlertService,
              private sakaiService: SakaiService,
              private appService: AppService,
              private importService: ImportService,
              private assignmentService: AssignmentService,
              private electronService: ElectronService) { }

  ngOnInit() {
    this.hierarchyModel$.subscribe(value => {
      if(value !== null && value !== undefined) {
        this.hierarchyModel = value;
        this.hierarchyModelKeys = Object.keys(this.hierarchyModel);

        const config = new MatDialogConfig();
        config.height = '400px';
        config.width = '600px';

        config.data = {
          hierarchyModel: this.hierarchyModel,
          hierarchyModelKeys : this.hierarchyModelKeys,
          filename: this.hierarchyModelKeys[0]
        };

        const isModalOpenedFn = () => {
          this.isModalOpened = !this.isModalOpened;
        };

        const reference = this.appService.createDialog(FileExplorerModalComponent, config, isModalOpenedFn);
        reference.beforeClosed().subscribe(() => {
        })
      }
    });

    this.appService.isLoading$.next(true);
    this.importService.getRubricDetails().subscribe((rubrics: IRubricName[]) => {
      this.rubrics = rubrics;
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, "Unable to retrieve rubrics");
      this.appService.isLoading$.next(false);
    });
    this.assignmentService.getWorkspaces().subscribe((workspaces: String[]) => {
      this.workspaces = workspaces;
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, "Unable to retrieve Workspaces");
      this.appService.isLoading$.next(false);
    });
    this.initForm();
    this.appService.isLoading$.next(false);
  }

  private initForm() {
    this.importForm = this.fb.group({
      assignmentType: [null],
      assignmentZipFileText: [null],
      assignmentName: [null],
      workspaceFolder:[null],
      noRubric: [this.noRubricDefaultValue],
      rubric: [null, Validators.required]
    });
  }

  async selectFile() {
    this.electronService.getFile({ name: 'Zip Files', extension: ['zip'] });
    this.electronService.getFileOb().subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
      this.showLoading(false);
      if (appSelectedPathInfo.selectedPath) {
        if (appSelectedPathInfo && appSelectedPathInfo.selectedPath) {
          this.showLoading(true);
          fetch('file:///' + appSelectedPathInfo.selectedPath)
            .then(response => {
              response.blob().then(async (blob: Blob) => {
                const pathSplit = appSelectedPathInfo.selectedPath.split('\\');
                this.file = await new File([blob], pathSplit[pathSplit.length - 1], { type: MimeTypesEnum.ZIP });
                this.actualFilePath = appSelectedPathInfo.selectedPath;
                this.onFileChange();
              }).catch(error => {
                this.showErrorMessage(error);
                this.showLoading(false);
              });
            })
            .catch(error => {
              this.showErrorMessage(error);
              this.showLoading(false);
            });
        } else {
          this.file = undefined;
          this.onFileChange();
        }
      } else if (appSelectedPathInfo.error) {
        this.alertService.error(appSelectedPathInfo.error.message);
      }
    });
  }

  onFileChange() {
    if(this.file !== undefined) {
      this.validMime = this.isValidMimeType(this.file.type);
      this.setFileDetailsAndAssignmentName(this.file);
    } else {
      this.validMime = false;
      this.setFileDetailsAndAssignmentName(undefined);
    }
    this.selectedType = this.fc.assignmentType.value;
      if(this.validMime &&  this.selectedType === "Assignment") {
      // Is zip, then checks structure.
              this.zipService.isValidZip(this.fc.assignmentName.value, this.file).subscribe((isValidFormat: boolean) => {
          this.isValidFormat = isValidFormat;
          if (!this.isValidFormat)
            this.alertService.error(this.sakaiService.formatErrorMessage);
          else {
            this.clearError();
          }
          this.isFileLoaded = true;
          this.showLoading(false);
        }, error => {
          this.showErrorMessage(error);
          this.showLoading(false);
        })
      }
   else  if(this.validMime &&  this.selectedType === "Generic") {
      this.isValidFormat = true;
      this.isFileLoaded = true;
        this.showLoading(false);
    }  else
      this.showLoading(false);
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
      this.appService.isLoading$.next(false);
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
      this.fc.rubric.disable();
      this.isRubric = false;
    } else {
      this.fc.rubric.setValidators(Validators.required);
      this.fc.rubric.updateValueAndValidity();
      this.fc.rubric.enable();
    }
    this.importForm.updateValueAndValidity();
  }

  onAssignmentTypeChange(event) {
    this.selectedType = this.fc.assignmentType.value;
    this.fc.assignmentType.updateValueAndValidity();
  }

  onPreview() {
    this.appService.isLoading$.next(true);
    this.zipService.getEntries(this.file, true).subscribe();
    this.isModalOpened = !this.isModalOpened;
  }

  onSubmit(event) {
    this.clearError();
    if (this.importForm.invalid || !this.validMime || !this.isValidFormat) {
      this.showErrorMessage("Please fill in the correct details!");
      return;
    }

    const {
      noRubric,
      rubric
    } = this.importForm.value;

    const importData = {
      file: this.actualFilePath,
      'noRubric': noRubric,
      'rubric': rubric,
      'assignmentType': this.selectedType
    };
    this.appService.isLoading$.next(true);
    this.importService.importAssignmentFile(importData).subscribe((events) => {

        if (events.type === HttpEventType.UploadProgress) {

        } else if (events.type === HttpEventType.Response) {
          this.appService.isLoading$.next(false);
          let response: any = events.body;
          this.alertService.success(response.message);
          this.resetForm();
        }
      }
      , error => this.appService.isLoading$.next(false));
  }
  private showLoading(isLoading: boolean) {
    this.appService.isLoading$.next(isLoading);
  }

  private showErrorMessage(errorMessage: string) {
    this.alertService.error(errorMessage);
  }

  private clearError() {
    this.alertService.clear();
  }

  private resetForm() {
    this.importForm.reset();
    this.file = undefined;
    this.isFileLoaded= false;
    this.isRubric= true;
    this.isModalOpened = false;
    this.validMime = false;
    this.isValidFormat = false;
    this.selectedType = undefined;
    this.fc.noRubric.setValue(this.noRubricDefaultValue);
    this.fc.rubric.enable();
    this.initForm();
    this.assignmentService.getAssignments().subscribe(assignments => {
      this.assignmentService.update(assignments);
    });
  }
}
