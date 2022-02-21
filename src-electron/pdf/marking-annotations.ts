import {readFileSync} from 'fs';
import {AnnotationFactory} from 'annotpdf';
import {
  ColorTypes,
  PageSizes,
  PDFDocument,
  PDFPage,
  PDFPageDrawRectangleOptions,
  PDFPageDrawSVGOptions,
  PDFPageDrawTextOptions,
  rgb,
  StandardFonts
} from 'pdf-lib';
import {IconTypeEnum} from '../../src/shared/info-objects/icon-type.enum';
import {HIGHTLIGHT_HEIGHT} from '../constants';
import {MarkInfo} from '../../src/shared/info-objects/mark.info';
import {IconSvgEnum} from '../../src/shared/info-objects/icon-svg.enum';
import {adjustPointsForResults, hexRgb, RgbaObject, rgbHex} from './pdf-utils';
import {isEmpty} from '../utils';

const getRgbScale = (rgbValue: number): number => {
  return +parseFloat(((rgbValue / 255) + '')).toFixed(2);
};

export const annotatePdfFile = async (filePath: string, marks: MarkInfo[][] = []): Promise<{ pdfBytes: Uint8Array, totalMark: number }> => {
  // Not sure what this is about, but without it the coords are on the wrong place compared to the editor
  const COORD_CONSTANT = (72 / 96);
  // Size of a mark circle
  const CIRCLE_SIZE = 10;
  let totalMark = 0;
  let generalMarks = 0;
  const sectionMarks: string[] = [];
  let pointer = 1;
  const pointers: string[] = [];
  const file = readFileSync(filePath);
  const pdfFactory = new AnnotationFactory(file);
  let pdfDoc = await PDFDocument.load(file);
  let pdfPages: PDFPage[] = await pdfDoc.getPages();
  let pageCount = 1;
  pdfPages.forEach((pdfPage: PDFPage) => {
    if (Array.isArray(marks[pageCount - 1])) {
      marks[pageCount - 1].forEach(markObj => {
        const coords = markObj.coordinates;
        if (markObj.iconType === IconTypeEnum.NUMBER) {
          totalMark += (markObj.totalMark) ? markObj.totalMark : 0;
          try {
            const CIRCLE_DIAMETER = (CIRCLE_SIZE * 2);
            pdfFactory.createTextAnnotation({
              page: pageCount - 1,
              rect: [
                ((coords.x  ) * COORD_CONSTANT) + CIRCLE_DIAMETER, // x1
                (pdfPage.getHeight() - (coords.y * COORD_CONSTANT)) - CIRCLE_DIAMETER, // y1
                ((coords.x  ) * COORD_CONSTANT) + (CIRCLE_DIAMETER * 2), // x2
                (pdfPage.getHeight() - (coords.y * COORD_CONSTANT)) // y2
              ],
              contents: markObj.comment,
              author: markObj.sectionLabel + ' = ' + markObj.totalMark
            });
          } catch (e) {
            pointers.push('*' + pointer + ': ' + markObj.comment);
            pointer++;
          }
          sectionMarks.push(markObj.sectionLabel + ' = ' + markObj.totalMark);
        } else if (markObj.iconType === IconTypeEnum.HIGHLIGHT) {
          try {
            const colorComponents = markObj.colour.match(/(\d\.?)+/g);
            pdfFactory.createHighlightAnnotation({
              page: pageCount - 1,
              rect: [
                (coords.x * COORD_CONSTANT), // x1
                pdfPage.getHeight() - (coords.y * COORD_CONSTANT) - HIGHTLIGHT_HEIGHT, // y1
                (coords.x  + coords.width) * COORD_CONSTANT, // x2
                pdfPage.getHeight() - (coords.y * COORD_CONSTANT) // y2
              ],
              color: {r: +colorComponents[0], g: +colorComponents[1], b: +colorComponents[2]},
              opacity: +colorComponents[3],
              contents: markObj.comment || '',
              author: markObj.sectionLabel || ''
            });
          } catch (e) {
            if (markObj.comment) {
              pointers.push('*' + pointer + ': ' + markObj.comment);
              pointer++;
            }
          }
        }
      });
    }
    pageCount++;
  });

  pageCount = 1;
  pointer = 1;
  pdfDoc = await PDFDocument.load(pdfFactory.write());
  pdfPages = await pdfDoc.getPages();
  pdfPages.forEach((pdfPage: PDFPage) => {
    if (Array.isArray(marks[pageCount - 1])) {
      marks[pageCount - 1].forEach((mark: MarkInfo) => {
        let colours: RgbaObject = hexRgb('#6F327A');
        if (mark.colour.startsWith('#')) {
          colours = hexRgb(mark.colour);
        } else if (mark.colour.startsWith('rgb')) {
          colours = hexRgb('#' + rgbHex(mark.colour));
        }
        const coords = mark.coordinates;
        const options: PDFPageDrawSVGOptions = {
          x: (coords.x * COORD_CONSTANT) + 4,
          y: pdfPage.getHeight() - (coords.y * COORD_CONSTANT),
          borderColor: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
          color: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
        };

        if (mark.iconType !== IconTypeEnum.NUMBER) {
          totalMark += (mark.totalMark) ? mark.totalMark : 0;
          generalMarks += (mark.totalMark) ? mark.totalMark : 0;
          if (mark.iconType === IconTypeEnum.FULL_MARK) {
            pdfPage.drawSvgPath(IconSvgEnum.FULL_MARK_SVG, options);
          } else if (mark.iconType === IconTypeEnum.HALF_MARK) {
            pdfPage.drawSvgPath(IconSvgEnum.FULL_MARK_SVG, options);
            pdfPage.drawSvgPath(IconSvgEnum.HALF_MARK_SVG, {
              x: (coords.x * COORD_CONSTANT) + 4,
              y: pdfPage.getHeight() - (coords.y * COORD_CONSTANT),
              borderWidth: 2,
              borderColor: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
              color: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue)),
            });
          } else if (mark.iconType === IconTypeEnum.CROSS) {
            pdfPage.drawSvgPath(IconSvgEnum.CROSS_SVG, options);
          } else if (mark.iconType === IconTypeEnum.ACK_MARK) {
            pdfPage.drawSvgPath(IconSvgEnum.ACK_MARK_SVG, options);
          } else if (mark.iconType === IconTypeEnum.HIGHLIGHT) {
            if (pointers.length > 0) {
              // Only if there were errors previously do we need to draw a highlight manually

              const colorComponents = mark.colour.match(/(\d\.?)+/g);
              const highlightOptions: PDFPageDrawRectangleOptions = {
                x: (coords.x * COORD_CONSTANT),
                y: pdfPage.getHeight() - (coords.y * COORD_CONSTANT) - HIGHTLIGHT_HEIGHT,
                width: coords.width * COORD_CONSTANT,
                height: HIGHTLIGHT_HEIGHT,
                color: {
                  type: ColorTypes.RGB,
                  red: +colorComponents[0],
                  green: +colorComponents[1],
                  blue: +colorComponents[2]
                },
                opacity: +colorComponents[3]
              };
              pdfPage.drawRectangle(highlightOptions);

              if (!isEmpty(mark.comment)) {
                const textOption: PDFPageDrawTextOptions = {
                  x: (coords.x * COORD_CONSTANT),
                  y: (pdfPage.getHeight() - (coords.y * COORD_CONSTANT)) - 20,
                  size: 10
                };
                pdfPage.drawText('*' + pointer, textOption);
                pointer++;
              }
            }

          }
        } else {
          if (mark.colour.startsWith('#')) {
            colours = hexRgb(mark.colour);
          } else if (mark.colour.startsWith('rgb')) {
            colours = hexRgb('#' + rgbHex(mark.colour));
          }
          const markOption = {
            x: (coords.x * COORD_CONSTANT) + (CIRCLE_SIZE / 2),
            y: (pdfPage.getHeight() - (coords.y * COORD_CONSTANT)) - (CIRCLE_SIZE * 2),
            size: CIRCLE_SIZE,
            color: rgb(1, 1, 1)
          };

          const circleOptions = {
            x: (coords.x * COORD_CONSTANT) + CIRCLE_SIZE,
            y: (pdfPage.getHeight() - (coords.y * COORD_CONSTANT)) - 16,
            size: CIRCLE_SIZE,
            color: rgb(getRgbScale(colours.red), getRgbScale(colours.green), getRgbScale(colours.blue))
          };

          pdfPage.drawCircle(circleOptions);
          pdfPage.drawText(mark.totalMark + '', markOption);

          if (pointers.length > 0) {
            // Only if there were errors previously do we need to draw a comment pointer
            const textOption: PDFPageDrawTextOptions = {
              x: (coords.x * COORD_CONSTANT) + 12,
              y: (pdfPage.getHeight() - (coords.y * COORD_CONSTANT)) - 5,
              size: 10
            };

            pdfPage.drawText('*' + pointer, textOption);
            pointer++;
          }
        }
      });
    }
    pageCount++;
  });

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

  for (let i = 0; i < sectionMarks.length; i++) {
    y = adjustPointsForResults(y, 15);
    resultsPage.drawText(sectionMarks[i] + '', {x: xPosition, y, size: textSize});
    resultsPage.drawText('', {x: xPosition, y, size: textSize});

    if (y <= 5) {
      resultsPage = pdfDoc.addPage(PageSizes.A4);
      y = 800;
    }
  }
  y = adjustPointsForResults(y, 15);
  resultsPage.drawText('General Marks = ' + generalMarks, {x: xPosition, y, size: textSize});
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
  resultsPage.drawText('Total = ' + totalMark, {x: xPosition, y, size: textSize});

  if (pointers.length > 0) {
    let feedbackPage = pdfDoc.addPage(PageSizes.A4);
    y = 800;

    feedbackPage.drawText('Feedback', {x: resultsPage.getWidth() / 2, y, size: headerSize});
    y = adjustPointsForResults(y, 15);
    y = adjustPointsForResults(y, 15);
    feedbackPage.drawText('_________________________________________________________________________________', {
      x: xPosition,
      y: 775,
      color: rgb(borderColor.red, borderColor.green, borderColor.blue),
      size: textSize
    });
    y = adjustPointsForResults(y, 15);

    for (let i = 0; i < pointers.length; i++) {
      const splitFeedback = fillParagraph(pointers[i], await pdfDoc.embedFont(StandardFonts.Helvetica), textSize, 400 ).split('\n');
      if (splitFeedback.length > 0) {
        for (let j = 0; j < splitFeedback.length; j++) {

          y = adjustPointsForResults(y, 15);
          feedbackPage.drawText(splitFeedback[j] + '', {x: xPosition, y, size: textSize});

          if (y <= 5) {
            feedbackPage = pdfDoc.addPage(PageSizes.A4);
            y = 800;
          }
        }
      } else {
        y = adjustPointsForResults(y, 15);
        feedbackPage.drawText(pointers[i] + '', {x: xPosition, y, size: textSize});

        if (y <= 5) {
          feedbackPage = pdfDoc.addPage(PageSizes.A4);
          y = 800;
        }
      }
    }
  }

  const newPdfBytes = await pdfDoc.save();
  return Promise.resolve({pdfBytes: newPdfBytes, totalMark});
};




function fillParagraph(text, font, fontSize, maxWidth) {
  const paragraphs = text.split('\n');
  for (let index = 0; index < paragraphs.length; index++) {
    const paragraph = paragraphs[index];
    if (font.widthOfTextAtSize(paragraph, fontSize) > maxWidth) {
      const words = paragraph.split(' ');
      const newParagraph = [];
      let i = 0;
      newParagraph[i] = [];
      for (const word of words) {
        newParagraph[i].push(word);
        if (font.widthOfTextAtSize(newParagraph[i].join(' '), fontSize) > maxWidth) {
          newParagraph[i].splice(-1); // retira a ultima palavra
          i = i + 1;
          newParagraph[i] = [];
          newParagraph[i].push(word);
        }
      }
      paragraphs[index] = newParagraph.map(p => p.join(' ')).join('\n');
    }
  }
  return paragraphs.join('\n');
}
