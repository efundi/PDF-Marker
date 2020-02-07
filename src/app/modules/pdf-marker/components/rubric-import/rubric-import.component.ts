import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {MatTableDataSource} from "@angular/material/table";
import {MatDialogConfig} from "@angular/material/dialog";
import {RubricViewComponent} from "@pdfMarkerModule/components/rubric-view/rubric-view.component";
import {AlertService} from "@coreModule/services/alert.service";
import {AppService} from "@coreModule/services/app.service";
import {Mapping} from "@coreModule/utils/mapping.class";
import {IRubric, IRubricName, Rubric, RubricCriteria, RubricCriteriaLevels} from "@coreModule/utils/rubric.class";
import {ImportService} from "@pdfMarkerModule/services/import.service";
import {MimeTypesEnum} from "@coreModule/utils/mime.types.enum";

@Component({
  selector: 'pdf-marker-rubric-import',
  templateUrl: './rubric-import.component.html',
  styleUrls: ['./rubric-import.component.scss']
})
export class RubricImportComponent implements OnInit {

  readonly displayedColumns: string[] = ['title', 'actions', 'inUse'];
  private file: File;
  private fileContents: IRubric;

  config: MatDialogConfig;

  rubricForm: FormGroup;
  dataSource: MatTableDataSource<IRubricName>;
  rubrics: IRubricName[];

  readonly MimeTypesEnum = MimeTypesEnum;

  constructor(private fb: FormBuilder,
              private alertService: AlertService,
              private appService: AppService,
              private importService: ImportService) { }

  ngOnInit() {
    this.appService.isLoading$.next(true);
    this.importService.getRubricDetails().subscribe((rubrics: IRubric[]) => {
      this.populateRubrics(rubrics);
      this.appService.isLoading$.next(false);
    }, error => {
      this.appService.openSnackBar(false, "Unable to retrieve rubrics");
      this.appService.isLoading$.next(false);
    });
    this.init();
  }

  private init() {
    this.rubricForm = this.fb.group({
      rubricName: [null, Validators.required],
      rubricFile: [null, Validators.required],
      rubricFileText: [null, Validators.required]
    });
  }

  get fc() {
    return this.rubricForm.controls;
  }

  async onFileChange(event) {
    this.alertService.clear();
    this.resetPreviousUpload();
    if(event.target.files[0] === undefined || event.target.files[0] === null) {
      this.fc.rubricFile.setValue(null);
      this.fc.rubricFileText.setValue(null);
    } else {
      const file: File = await event.target.files[0];
      if(file && file.type === MimeTypesEnum.JSON) {

        const reader = new FileReader();

        reader.addEventListener('loadend', (e) => {

          try {
            const json: IRubric = JSON.parse(reader.result.toString()) as IRubric;

            if(Mapping.isTypeOf(json, Rubric)) {
              let isError: boolean = false;
              for(let i = 0; i < json.criterias.length; i++) {
                if(!Mapping.isTypeOf(json.criterias[i], RubricCriteria) || !Mapping.isCollectionTypeOf(json.criterias[i].levels, RubricCriteriaLevels)) {
                  isError  = true;
                  break;
                }
              }

              if(!isError) {
                this.fc.rubricFile.setErrors(null);
                this.fc.rubricFileText.setValue(file.name);
                this.fc.rubricName.setValue(this.getRubricNameFromFilename(file.name));
                this.file = file;
                this.fileContents = json;
              } else {
                this.setErrorMessage(file, "Invalid rubric!");
              }
            } else {
              this.setErrorMessage(file, "Invalid rubric criteria!");
            }
          } catch (e) {
            this.setErrorMessage(file, "Cannot convert provided file to valid JSON!");
          }
        });

        reader.readAsText(file);

      } else {
        this.setErrorMessage(file, "File must be a valid JSON file!");
      }
    }
    //this..updateValueAndValidity();
  }

  private setErrorMessage(file: File, errorMsg: string) {
    this.alertService.error("File must be a valid JSON file!");
    this.fc.rubricFile.setErrors({file: true});
    this.fc.rubricFileText.setValue(file.name);
    this.fc.rubricName.setValue(null);
  }

  showRubric(rubricName: string) {
    this.openRubricModal(rubricName);
    console.log("Show Rubric at index = " + rubricName);
  }

  deleteRubric(rubricName: string) {
    console.log("Delete Rubric name = " + rubricName);
    let data  = { rubricName: rubricName};
    this.appService.isLoading$.next(true);
    this.importService.deleteRubric(data).subscribe((rubrics: IRubric[]) => {
      this.populateRubrics(rubrics);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, "Rubric deleted");
    }, error => {
      this.appService.openSnackBar(false, "Unable to delete");
      this.appService.isLoading$.next(false)
    });
  }

  private resetPreviousUpload() {
    this.rubricForm.reset();
    this.rubricForm.updateValueAndValidity();
  }

  onResetpreviousUpload() {
    this.resetPreviousUpload();
  }

  private getRubricNameFromFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, "");
  }

  onSubmit(event) {
    this.alertService.clear();
    if(this.rubricForm.invalid) {
      this.alertService.error("Please fill in the correct details!");
      return;
    }

    let formData: FormData = new FormData();
    formData.append("rubricName", this.fc.rubricName.value);
    formData.append('file', this.file);

    this.appService.isLoading$.next(true);
    this.importService.importRubricFile(formData).subscribe((rubrics: IRubricName[]) => {
      this.populateRubrics(rubrics);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, "Rubric saved");
      this.resetPreviousUpload();
    }, error => {
      this.appService.openSnackBar(false, "Unable to save");
      this.appService.isLoading$.next(false);
    });
  }

  private populateRubrics(rubrics: IRubricName[]) {
    this.rubrics = rubrics;
    this.dataSource = new MatTableDataSource<IRubricName>(this.rubrics);
  }

  private openRubricModal(rubricName: string) {

    console.log("Open Rubric name = " + rubricName);
    let data  = { rubricName: rubricName };
    console.log(data);
    this.importService.getRubricContents(data).subscribe((rubric: IRubric)  => {
      this.openRubricModalDialog(rubric);
      this.appService.isLoading$.next(false);
      this.appService.openSnackBar(true, "Rubric View Opened");
    }, error => {
      this.appService.openSnackBar(false, "Rubric View Failed");
      this.appService.isLoading$.next(false)
    });
  }
  private openRubricModalDialog(rubric: IRubric) {
    const config = new MatDialogConfig();
    config.disableClose = false;
    config.width = "1500px";
    config.height = "750px";
    config.data = {
      name: rubric.name,
      criterias:  rubric.criterias,
    }

    this.appService.createDialog(RubricViewComponent, config);  }

}
