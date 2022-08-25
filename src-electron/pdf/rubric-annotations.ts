import {PageSizes, PDFDocument, rgb, RotationTypes} from 'pdf-lib';
import {isNullOrUndefinedOrEmpty} from '../utils';
import {adjustPointsForResults} from './pdf-utils';
import {IRubric} from '@shared/info-objects/rubric.class';
import {readFile} from 'fs/promises';
import {RubricSubmissionInfo} from '@shared/info-objects/submission.info';

function rotatePages(pdfDoc: PDFDocument, submissionInfo: RubricSubmissionInfo) {
  pdfDoc.getPages().forEach((p, index) => {
      const pageSettings = submissionInfo.pageSettings[index];

      if (pageSettings && pageSettings.rotation) {
        p.setRotation({
          type: RotationTypes.Degrees,
          angle: pageSettings.rotation
        });
      } else if (p.getRotation().type === RotationTypes.Radians) {
        // Convert radians to degrees
        p.setRotation({
          type: RotationTypes.Degrees,
          angle: p.getRotation().angle * (180 / Math.PI)
        });
      }
    });
}

export function annotatePdfRubric(filePath: string, submissionInfo: RubricSubmissionInfo, rubric: IRubric): Promise<Uint8Array> {
  return readFile(filePath)
    .then(data => PDFDocument.load(data))
    .then(pdfDoc => {
      rotatePages(pdfDoc, submissionInfo);
      let totalMark = 0;
      const marksPageSize: [number, number] = [1200.89, 595.28];
      let resultsPage = pdfDoc.addPage(marksPageSize);
      let yPosition: number = resultsPage.getHeight() - 15;
      let xPosition = 25;
      const headerSize = 14;
      const rubricTextSize = 8;
      const borderColor = {red: 0.21, green: 0.21, blue: 0.21};
      const rubricCriteriaLevelBackground = {red: 1.0, green: 1.0, blue: 1.0};
      const rubricCriteriaLevelBackgroundSelected = {red: 0.93, green: 0.93, blue: 0.93};
      let criteriaColors = {red: 1.0, green: 1.0, blue: 1.0};
      let maxScore = 0;
      rubric.criterias.forEach((value, index) => {
        let curHighest = -1;
        const critSelected = submissionInfo.marks[index];
        value.levels.forEach((value1, index1, array) => {
          if (critSelected === index1) {
            totalMark = totalMark + parseFloat(value1.score.toString());
          }
          if (value1.score > curHighest) {
            curHighest = value1.score;
          }
        });
        maxScore = maxScore + parseFloat(curHighest.toString());
      });

      // 841 pixels x 595.28 pixels
      resultsPage.drawText('Results', {x: xPosition, y: yPosition, size: headerSize});
      yPosition = adjustPointsForResults(yPosition, 15); // y = 580
      resultsPage.drawText('Total Mark: ' + totalMark + ' / ' + maxScore, {x: xPosition, y: yPosition, size: headerSize});

      yPosition = adjustPointsForResults(yPosition, 20); // spacing between header and blocks.

      // Rubric - loop for criterias
      let criteriaCount = 0;
      rubric.criterias.forEach((value, criteriaIndex) => {
        criteriaCount++;
        yPosition = adjustPointsForResults(yPosition, 130);
        resultsPage.drawRectangle({
          x: xPosition,
          y: yPosition,
          width: 130,
          height: 130,
          borderWidth: 1,
          color: rgb(rubricCriteriaLevelBackground.red, rubricCriteriaLevelBackground.green, rubricCriteriaLevelBackground.blue),
          borderColor: rgb(borderColor.red, borderColor.green, borderColor.blue),
        });

        resultsPage.drawText(rubric.criterias[criteriaIndex].name, {x: (xPosition + 3), y: (yPosition + 110), size: rubricTextSize});
        let critSelected = submissionInfo.marks[criteriaIndex];
        const splitDesc = (rubric.criterias[criteriaIndex].description.split(' '));
        const criteriaDescriptionX = xPosition + 1;
        let criteriaDescriptionY = yPosition + 90; // remember + is upwards, - is down, and function minues by default.
        // Rubric - loop for criteria-Descriptions -- start
        for (let index = 0; index <= splitDesc.length; index = index + 3) {
          let curString = '';
          if (!isNullOrUndefinedOrEmpty(splitDesc[index])) {
            curString = curString + splitDesc[index] + ' ';
          }
          if (!isNullOrUndefinedOrEmpty(splitDesc[index + 1])) {
            curString = curString + splitDesc[index + 1] + ' ';
          }
          if (!isNullOrUndefinedOrEmpty(splitDesc[index + 2])) {
            curString = curString + splitDesc[index + 2] + ' ';
          }
          resultsPage.drawText(curString, {x: (criteriaDescriptionX + 3), y: (criteriaDescriptionY), size: rubricTextSize});
          criteriaDescriptionY = criteriaDescriptionY - 10;
        }
        let criteriaLevelX = xPosition;
        const criteriaLevelY = yPosition;

        rubric.criterias[criteriaIndex].levels.forEach((level, levelIndex) => {
          // check selected here against marks.
          if (critSelected === levelIndex) {
            criteriaColors = rubricCriteriaLevelBackgroundSelected;
            critSelected = -1;
          } else {
            criteriaColors = rubricCriteriaLevelBackground;
          }

          criteriaLevelX = criteriaLevelX + 130;
          resultsPage.drawRectangle({
            x: criteriaLevelX,
            y: criteriaLevelY,
            width: 130,
            height: 130,
            borderWidth: 1,
            color: rgb(criteriaColors.red, criteriaColors.green, criteriaColors.blue),
            borderColor: rgb(borderColor.red, borderColor.green, borderColor.blue),
          });
          resultsPage.drawText(level.label + ' - Marks: ' + level.score, {
            x: (criteriaLevelX + 3),
            y: (criteriaLevelY + 120),
            size: rubricTextSize
          });

          const splitDesc = (level.description.replace('\n', '').split(' '));
          // let splitDesc = (level.description.replace('\n', '').split(''));
          const levelDescriptionX = criteriaLevelX + 1;
          let levelDescriptionY = criteriaLevelY + 110; // remember + is upwards, - is down, and function minues by default.
          // Rubric - loop for criteria-Descriptions -- start
          let lineCount = 0;
          for (let index = 0; index <= splitDesc.length; index += 5) {
            let curString = '';
            if (!isNullOrUndefinedOrEmpty(splitDesc[index])) {
              curString = curString + splitDesc[index].replace('\n', '') + ' ';
            }
            if (!isNullOrUndefinedOrEmpty(splitDesc[index + 1])) {
              curString = curString + splitDesc[index + 1].replace('\n', '') + ' ';
            }
            if (!isNullOrUndefinedOrEmpty(splitDesc[index + 2])) {
              curString = curString + splitDesc[index + 2].replace('\n', '') + ' ';
            }
            if (!isNullOrUndefinedOrEmpty(splitDesc[index + 3])) {
              curString = curString + splitDesc[index + 3].replace('\n', '') + ' ';
            }
            if (curString.length < 42) {
              if (!isNullOrUndefinedOrEmpty(splitDesc[index + 4])) {
                curString = curString + splitDesc[index + 4].replace('\n', '') + ' ';
              }
            } else {
              index--;
            }
            lineCount++;
            if (lineCount === 12 && !isNullOrUndefinedOrEmpty(curString)) {
              curString = curString + '...';
              index = splitDesc.length + 1;
              lineCount = 0;
            }
            resultsPage.drawText(curString, {x: (levelDescriptionX + 1), y: (levelDescriptionY), size: rubricTextSize - 2});
            levelDescriptionY = levelDescriptionY - 10;
          }
          // Rubric - loop for level descripotion -- end
        });

        // check for max pages. Maybe use dimnesnsions rather?
        if ((criteriaCount === 4) && (rubric.criterias.length > criteriaCount)) {
          resultsPage = pdfDoc.addPage(marksPageSize);
          yPosition = resultsPage.getHeight() - 15;
          xPosition = 25;
          criteriaCount = 0;
        }
      });


      return pdfDoc.save();
    });
}
