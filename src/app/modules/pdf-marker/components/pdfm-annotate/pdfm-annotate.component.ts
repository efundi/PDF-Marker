import {Component, OnInit} from '@angular/core';
// import __pdfjs from '../../../../../assets/pdfjs/build/pdf';
import {twitter} from 'twitter-text';
import {PDFJSAnnotate, UI} from 'pdf-annotate';
import {initColorPicker} from '../../../../../shared/initColorPicker';


const documentId = 'example.pdf';
const pdfjsLib = window['pdfjs-dist/build/pdf'];

@Component({
  selector: 'pdf-marker-pdfm-annotate',
  templateUrl: './pdfm-annotate.component.html',
  styleUrls: ['./pdfm-annotate.component.scss']
})
export class PdfmAnnotateComponent implements OnInit {
  // const {UI} = PDFJSAnnotate;
  NUM_PAGES = 0;
  PAGE_HEIGHT = 0;
  RENDER_OPTIONS = {
    documentId,
    pdfDocument: null,
    scale: parseFloat(localStorage.getItem(`${documentId}/scale`)) || 1.33,
    rotate: parseInt(localStorage.getItem(`${documentId}/rotate`), 10) || 0
  };

  tooltype = localStorage.getItem(`${this.RENDER_OPTIONS.documentId}/tooltype`) || 'cursor';

  constructor() {
    document.querySelector('.toolbar').addEventListener('click', this.handleToolbarClick);
  }

  ngOnInit() {
    // Loaded via <script> tag, create shortcut to access PDF.js exports.
    pdfjsLib.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';
    PDFJSAnnotate.setStoreAdapter(new PDFJSAnnotate.LocalStoreAdapter());
    // PDFJS.workerSrc = './shared/pdf.worker.js';
    pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.js';
    // Render stuff
    this.render();

    document.getElementById('content-wrapper').addEventListener('scroll', (e) => {
      const target = e.target as Element;
      let visiblePageNum = Math.round(target.scrollTop / this.PAGE_HEIGHT) + 1;
      let visiblePage = document.querySelector(`.page[data-page-number="${visiblePageNum}"][data-loaded="false"]`);
      if (visiblePage) {
        setTimeout(function () {
          UI.renderPage(visiblePageNum, this.RENDER_OPTIONS);
        });
      }
    });

    // const tooltype = localStorage.getItem(`${this.RENDER_OPTIONS.documentId}/tooltype`) || 'cursor';
    if (this.tooltype) {
      this.setActiveToolbarItem(this.tooltype, document.querySelector(`.toolbar button[data-tooltype=${this.tooltype}]`));
    }

  }

  private handleToolbarClick(e) {
    if (e.target.nodeName === 'BUTTON') {
      this.setActiveToolbarItem(e.target.getAttribute('data-tooltype'), e.target);
    }
  }

  private setActiveToolbarItem(type, button) {
    let active = document.querySelector('.toolbar button.active');
    if (active) {
      active.classList.remove('active');

      switch (this.tooltype) {
        case 'cursor':
          UI.disableEdit();
          break;
        case 'draw':
          UI.disablePen();
          break;
        case 'text':
          UI.disableText();
          break;
        case 'point':
          UI.disablePoint();
          break;
        case 'area':
        case 'highlight':
        case 'strikeout':
          UI.disableRect();
          break;
      }
    }

    if (button) {
      button.classList.add('active');
    }
    if (this.tooltype !== type) {
      localStorage.setItem(`${this.RENDER_OPTIONS.documentId}/tooltype`, type);
    }
    this.tooltype = type;

    switch (type) {
      case 'cursor':
        UI.enableEdit();
        break;
      case 'draw':
        UI.enablePen();
        break;
      case 'text':
        UI.enableText();
        break;
      case 'point':
        UI.enablePoint();
        break;
      case 'area':
      case 'highlight':
      case 'strikeout':
        UI.enableRect(type);
        break;
    }
  }

  render() {
    const loadingTask = pdfjsLib.getDocument({
      url: this.RENDER_OPTIONS.documentId,
      cMapUrl: 'shared/cmaps/',
      cMapPacked: true
    });

    loadingTask.promise.then((pdf) => {
      this.RENDER_OPTIONS.pdfDocument = pdf;

      const viewer = document.getElementById('viewer');
      viewer.innerHTML = '';
      this.NUM_PAGES = pdf.numPages;
      for (let i = 0; i < this.NUM_PAGES; i++) {
        const page = UI.createPage(i + 1);
        viewer.appendChild(page);
      }

      UI.renderPage(1, this.RENDER_OPTIONS).then(([pdfPage, annotations]) => {
        const viewport = pdfPage.getViewport({scale: this.RENDER_OPTIONS.scale, rotation: this.RENDER_OPTIONS.rotate});
        this.PAGE_HEIGHT = viewport.height;
      });
    });
  }
}
