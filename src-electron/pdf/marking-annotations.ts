import {AnnotationFactory} from 'annotpdf';
import {PageSizes, PDFDocument, PDFPageDrawSVGOptions, rgb, RotationTypes} from 'pdf-lib';
import {IconTypeEnum} from '@shared/info-objects/icon-type.enum';
import {HIGHTLIGHT_HEIGHT} from '../constants';
import {MarkCoordinate, MarkInfo} from '@shared/info-objects/mark.info';
import {IconSvgEnum} from '@shared/info-objects/icon-svg.enum';
import {adjustPointsForResults, hexRgb, RgbaObject, rgbHex} from './pdf-utils';
import {readFile} from 'fs/promises';
import {MarkingSubmissionInfo} from '@shared/info-objects/submission.info';

const getRgbScale = (rgbValue: number): number => {
  return +parseFloat(((rgbValue / 255) + '')).toFixed(2);
};
const COORD_CONSTANT = (72 / 96);
// Size of a mark circle
const CIRCLE_SIZE = 10;
const CIRCLE_DIAMETER = (CIRCLE_SIZE * 2);

interface AnnotationSession {
  data: Uint8Array;
  totalMark: number;
  generalMarks: number;
  sectionMarks: string[];
}


function rotatePages(session: AnnotationSession, submissionInfo: MarkingSubmissionInfo): Promise<AnnotationSession> {
  return PDFDocument.load(session.data).then((pdfDoc) => {
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
    return pdfDoc.save();
  }).then((data) => {
    session.data = data;
    return session;
  });
}

/**
 * Rotate the coordinates for the page rotation
 * @param coord
 * @param angle
 * @param width
 * @param height
 */
function rotate(coord: MarkCoordinate, angle: number, width: number, height: number): MarkCoordinate {
  if (angle === 90) {
    return {
      ...coord,
      x : coord.y,
      y : coord.x
    };
  } else if (angle === 180) {
    return {
      ...coord,
      x: width - coord.x,
      y: coord.y
    };
  } else if (angle === 270) {
    return {
      ...coord,
      x: width - coord.y,
      y: height - coord.x
    };
  } else {
    return {
      ...coord,
      x: coord.x,
      y : height - coord.y
    };
  }
}

function rotateHighlight(coord: MarkCoordinate, angle: number, width: number, height: number): number[] {
  const highlightHeight = (HIGHTLIGHT_HEIGHT * COORD_CONSTANT);
  if (angle === 90) {
    return [
      /*x1 */ coord.y,
      /*y1 */ coord.x,
      /*x2 */ coord.y + highlightHeight,
      /*y2 */ coord.x + coord.width,
    ];
  } else if (angle === 180) {
    return [
      /*x2 */ width - coord.x - coord.width,
      /*y2 */ coord.y + highlightHeight,
      /*x1 */ width - coord.x,
      /*y1 */ coord.y,
    ];
  } else if (angle === 270) {
    return [
      /*x1 */ width - coord.y - highlightHeight,
      /*y1 */ height - coord.x,
      /*x2 */ width - coord.y,
      /*y2 */ height - coord.x - coord.width
    ];
  } else {
    return [
      /*x1 */ coord.x,
      /*y1 */ height - coord.y - highlightHeight,
      /*x2 */ coord.x + coord.width,
      /*y2 */ height - coord.y
    ];
  }
}

function rotateCircle(coord: MarkCoordinate, angle: number, width: number, height: number): number[] {
  if (angle === 90) {
    return [
      /*x1 */ coord.y,
      /*y1 */ coord.x,
      /*x2 */ coord.y + CIRCLE_DIAMETER,
      /*y2 */ coord.x + CIRCLE_DIAMETER,
    ];
  } else if (angle === 180) {
    return [
      /*x2 */ width - coord.x - CIRCLE_DIAMETER,
      /*y2 */ coord.y + CIRCLE_DIAMETER,
      /*x1 */ width - coord.x,
      /*y1 */ coord.y,
    ];
  } else if (angle === 270) {
    return [
      /*x1 */ width - coord.y - CIRCLE_DIAMETER,
      /*y1 */ height - coord.x,
      /*x2 */ width - coord.y,
      /*y2 */ height - coord.x - CIRCLE_DIAMETER
    ];
  } else {
    return [
      /*x1 */ coord.x,
      /*y1 */ height - coord.y - CIRCLE_DIAMETER,
      /*x2 */ coord.x + CIRCLE_DIAMETER,
      /*y2 */ height - coord.y
    ];
  }
}

/**
 * Transform the coords to match the PDF scale
 * @param coords
 */
function transform(coords: MarkCoordinate): MarkCoordinate {
  return {
    ...coords,
    width: coords.width ? coords.width * COORD_CONSTANT : null,
    x:  (coords.x * COORD_CONSTANT),
    y : (coords.y * COORD_CONSTANT)
  };
}

/**
 * Use the annotation library to add annotations
 * @param session
 * @param marks
 */
function addAnnotations(session: AnnotationSession, marks: MarkInfo[][] = []): Promise<AnnotationSession> {
  const annotationFactory = new AnnotationFactory(session.data);
  return PDFDocument.load(session.data).then((pdfDoc) => {
    pdfDoc.getPages().forEach((pdfPage, pageIndex) => {

      if (Array.isArray(marks[pageIndex])) {
        marks[pageIndex].forEach(mark => {
          let coords = transform(mark.coordinates);
          if (mark.iconType === IconTypeEnum.NUMBER) {

            session.totalMark += (mark.totalMark) ? mark.totalMark : 0;
            const annot = annotationFactory.createTextAnnotation({
              page: pageIndex,
              rect: rotateCircle(coords, pdfPage.getRotation().angle, pdfPage.getWidth(), pdfPage.getHeight()),
              contents: mark.comment,
              author: mark.sectionLabel + ' = ' + mark.totalMark
            });
            session.sectionMarks.push(mark.sectionLabel + ' = ' + mark.totalMark);
          } else if (mark.iconType === IconTypeEnum.HIGHLIGHT) {
            const colorComponents = mark.colour.match(/(\d\.?)+/g);
            const annot = annotationFactory.createHighlightAnnotation({
              page: pageIndex,
              rect: rotateHighlight(coords, pdfPage.getRotation().angle, pdfPage.getWidth(), pdfPage.getHeight()),
              color: {r: +colorComponents[0], g: +colorComponents[1], b: +colorComponents[2]},
              opacity: +colorComponents[3],
              contents: mark.comment || '',
              author: mark.sectionLabel || ''
            });

            annot.createDefaultAppearanceStream();
          }
        });
      }
    });
    session.data = annotationFactory.write();
    return session;
  });
}

function addPdfMarks(session: AnnotationSession, marks: MarkInfo[][]): Promise<AnnotationSession> {
  return PDFDocument.load(session.data).then((pdfDoc) => {
    pdfDoc.getPages().forEach((pdfPage, pageIndex) => {
      if (Array.isArray(marks[pageIndex])) {
        marks[pageIndex].forEach(mark => {
          let coords = transform(mark.coordinates);
          coords = rotate(coords, pdfPage.getRotation().angle, pdfPage.getWidth(), pdfPage.getHeight());

          if (mark.iconType !== IconTypeEnum.NUMBER) {
            let colours: RgbaObject = hexRgb('#6F327A');
            if (mark.colour.startsWith('#')) {
              colours = hexRgb(mark.colour);
            } else if (mark.colour.startsWith('rgb')) {
              colours = hexRgb('#' + rgbHex(mark.colour));
            }
            const options: PDFPageDrawSVGOptions = {
              x: coords.x + 4,
              y: coords.y,
              borderColor: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
              color: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
              rotate: {
                type: RotationTypes.Degrees,
                angle: pdfPage.getRotation().angle
              }
            };
            session.totalMark += (mark.totalMark) ? mark.totalMark : 0;
            session.generalMarks += (mark.totalMark) ? mark.totalMark : 0;
            if (mark.iconType === IconTypeEnum.FULL_MARK) {
              pdfPage.drawSvgPath(IconSvgEnum.FULL_MARK_SVG, options);
            } else if (mark.iconType === IconTypeEnum.HALF_MARK) {
              pdfPage.drawSvgPath(IconSvgEnum.FULL_MARK_SVG, options);
              pdfPage.drawSvgPath(IconSvgEnum.HALF_MARK_SVG, {
                x: coords.x + 4,
                y: coords.y,
                borderWidth: 2,
                borderColor: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
                color: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
                rotate: {
                  type: RotationTypes.Degrees,
                  angle: pdfPage.getRotation().angle
                }
              });
            } else if (mark.iconType === IconTypeEnum.CROSS) {
              pdfPage.drawSvgPath(IconSvgEnum.CROSS_SVG, options);
            } else if (mark.iconType === IconTypeEnum.ACK_MARK) {
              pdfPage.drawSvgPath(IconSvgEnum.ACK_MARK_SVG, options);
            }
          }
        });
      }
    });
    addResultsPage(session, pdfDoc);
    return pdfDoc.save().then((data) => {
      session.data = data;
      return session;
    });
  });
}


function addResultsPage(session: AnnotationSession, pdfDoc: PDFDocument) {
  let resultsPage = pdfDoc.addPage(PageSizes.A4);
  let y = 800;
  const xPosition = 25;
  const headerSize = 14;
  const textSize = 12;
  const borderColor = {red: 0.71, green: 0.71, blue: 0.71};

  resultsPage.drawText('Results', {x: resultsPage.getWidth() / 2, y, size: headerSize});
  y = adjustPointsForResults(y, 15);
  y = adjustPointsForResults(y, 15);

  resultsPage.drawText('_________________________________________________________________________________',
    {
      x: xPosition,
      y: 775,
      color: rgb(borderColor.red, borderColor.green, borderColor.blue),
      size: textSize
    });
  y = adjustPointsForResults(y, 15);

  for (let i = 0; i < session.sectionMarks.length; i++) {
    y = adjustPointsForResults(y, 15);
    resultsPage.drawText(session.sectionMarks[i] + '', {x: xPosition, y, size: textSize});
    resultsPage.drawText('', {x: xPosition, y, size: textSize});

    if (y <= 5) {
      resultsPage = pdfDoc.addPage(PageSizes.A4);
      y = 800;
    }
  }
  y = adjustPointsForResults(y, 15);
  resultsPage.drawText('General Marks = ' + session.generalMarks, {x: xPosition, y, size: textSize});
  y = adjustPointsForResults(y, 15);
  resultsPage.drawText('_________________________________________________________________________________', {
    x: xPosition,
    y,
    color: rgb(borderColor.red, borderColor.green, borderColor.blue),
    size: textSize
  });
  y = adjustPointsForResults(y, 15);
  resultsPage.drawText('', {x: xPosition, y, size: textSize});
  y = adjustPointsForResults(y, 15);
  resultsPage.drawText('Total = ' + session.totalMark, {x: xPosition, y, size: textSize});
}

export function annotatePdfFile(filePath: string, submissionInfo: MarkingSubmissionInfo): Promise<{ pdfBytes: Uint8Array, totalMark: number }> {
  return readFile(filePath)
    .then((data) => {
      const session: AnnotationSession = {
        data: data,
        totalMark: 0,
        sectionMarks: [],
        generalMarks: 0
      };
      return session;
    })
    .then(session => rotatePages(session, submissionInfo))
    .then((session) => {
      return addAnnotations(session, submissionInfo.marks);
    })
    .then((session) => addPdfMarks(session, submissionInfo.marks))
    .then((session) => {
      return {
        pdfBytes: session.data,
        totalMark: session.totalMark
      };
    });
}
