import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ZipService} from '@coreModule/services/zip.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {FileExplorerModalComponent} from '@sharedModule/components/file-explorer-modal/file-explorer-modal.component';
import {AlertService} from '@coreModule/services/alert.service';
import {SakaiService} from '@coreModule/services/sakai.service';
import {AppService} from '@coreModule/services/app.service';
import {ImportService} from '@pdfMarkerModule/services/import.service';
import {AssignmentService} from '@sharedModule/services/assignment.service';
import {AppSelectedPathInfo} from '../../../../../shared/info-objects/app-selected-path.info';
import {ElectronService} from '@coreModule/services/electron.service';
import {WorkspaceService} from '@sharedModule/services/workspace.service';
import {PdfmUtilsService} from '@pdfMarkerModule/services/pdfm-utils.service';
import {IRubricName} from '../../../../../shared/info-objects/rubric.class';
import {RubricService} from '@sharedModule/services/rubric.service';
import {ImportInfo} from '../../../../../shared/info-objects/import.info';
import {SakaiConstants} from '../../../../../shared/constants/sakai.constants';
import {isNil} from 'lodash';

@Component({
  selector: 'pdf-marker-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {

  readonly acceptMimeType = ['application/zip', 'application/x-zip-compressed'];

  readonly isAssignmentName: boolean = true;

  readonly noRubricDefaultValue: boolean = false;

  private hierarchyModel;

  private hierarchyModelKeys;

  isFileLoaded = false;

  importForm: FormGroup;

  isRubric = true;

  isModalOpened = false;

  isValidFormat: boolean;

  rubrics: IRubricName[];

  workspaces: string[] = [];

  selected: string;

  private actualFilePath: string;
  assignmentTypeID = 'Assignment';
  assignmentTypes = [
    {'name': 'Assignment'},
    {'name': 'Generic'}];
  selectedType: string;
  selectedWorkspace: string;

  constructor(private fb: FormBuilder,
              private zipService: ZipService,
              private dialog: MatDialog,
              private alertService: AlertService,
              private sakaiService: SakaiService,
              private appService: AppService,
              private importService: ImportService,
              private rubricService: RubricService,
              private assignmentService: AssignmentService,
              private workspaceService: WorkspaceService,
              private electronService: ElectronService) { }

  ngOnInit() {

    this.appService.isLoading$.next(true);
    this.rubricService.getRubricNames().subscribe((rubrics: IRubricName[]) => {
      this.rubrics = rubrics;
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, 'Unable to retrieve rubrics');
    });
    this.appService.isLoading$.next(false);
    this.workspaceService.getWorkspaces().subscribe((workspaces: string[]) => {
      if (workspaces) {
        this.workspaces = [...workspaces];
        this.workspaces = this.workspaces.map(item => {
          return PdfmUtilsService.basename(item);
        });
      }
      this.workspaces.unshift('Default Workspace');
      if (this.workspaces.length <= 1) {
        this.importForm.controls.workspaceFolder.setValue('Default Workspace');
      }
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, 'Unable to retrieve workspaces');
      this.appService.isLoading$.next(false);
    });

    this.initForm();

    this.appService.isLoading$.next(false);
  }

  compareCategoryObjects(object1: any, object2: any) {
    return object1 && object2 && object1.id == object2.id;
  }

  private initForm() {
    this.importForm = this.fb.group({
      assignmentType: [null],
      assignmentZipFileText: [null],
      assignmentName: [null],
      workspaceFolder: [null, Validators.required],
      noRubric: [this.noRubricDefaultValue],
      rubric: [null, Validators.required]
    });
  }

  async selectFile() {
    this.electronService.getFile({ name: 'Zip Files', extension: ['zip'] })
      .subscribe((appSelectedPathInfo: AppSelectedPathInfo) => {
        this.showLoading(false);
        if (appSelectedPathInfo.selectedPath) {
          this.showLoading(true);
          this.actualFilePath = appSelectedPathInfo.selectedPath;
        }

        this.onFileChange(appSelectedPathInfo);
        if (appSelectedPathInfo.error) {
          this.alertService.error(appSelectedPathInfo.error.message);
        }
      });
  }

  onFileChange(appSelectedPathInfo: AppSelectedPathInfo) {

    this.fc.assignmentZipFileText.setValue((appSelectedPathInfo) ? appSelectedPathInfo.basename : '');
    this.fc.assignmentName.setValue(appSelectedPathInfo ? this.getAssignmentNameFromFilename(appSelectedPathInfo.fileName) : '');

    this.selectedType = this.fc.assignmentType.value;
    if (this.selectedType === 'Assignment') {
      // Is zip, then checks structure.
      this.importService.isValidSakaiZip(appSelectedPathInfo.selectedPath).subscribe((isValidFormat: boolean) => {
        this.isValidFormat = isValidFormat;
        if (!this.isValidFormat) {
          this.alertService.error(SakaiConstants.formatErrorMessage);
        } else {
          this.clearError();
        }
        this.isFileLoaded = true;
        this.showLoading(false);
      }, error => {
        this.showErrorMessage(error);
        this.showLoading(false);
      });
    } else  if (this.selectedType === 'Generic') {
      this.isValidFormat = true;
      this.isFileLoaded = true;
      this.showLoading(false);
    }  else {
      this.showLoading(false);
    }
  }

  private getAssignmentNameFromFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }

  get fc() {
    return this.importForm.controls;
  }

  onRubricChange(event) {
    if (this.fc.noRubric.value) {
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
    this.importService.getZipEntries(this.actualFilePath)
      .subscribe((zipInfor) => {
        const value = this.zipService.getZipModel(zipInfor);
        if (!isNil(value)) {
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
          });
        }
      });
    this.isModalOpened = !this.isModalOpened;
  }

  onSubmit(event) {
    this.clearError();
    if (this.importForm.invalid || !this.isValidFormat) {
      this.showErrorMessage('Please fill in the correct details!');
      return;
    }

    const {
      assignmentName,
      noRubric,
      rubric,
      workspaceFolder
    } = this.importForm.value;

    const importData: ImportInfo = {
      file: this.actualFilePath,
      workspace: workspaceFolder,
      noRubric: noRubric,
      rubricName: rubric,
      assignmentName: assignmentName,
      assignmentType: this.selectedType
    };
    this.appService.isLoading$.next(true);
    this.importService.importAssignmentFile(importData).subscribe((msg) => {

        this.appService.isLoading$.next(false);
        this.alertService.success(msg);
        this.resetForm();
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
    this.isFileLoaded = false;
    this.isRubric = true;
    this.isModalOpened = false;
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
