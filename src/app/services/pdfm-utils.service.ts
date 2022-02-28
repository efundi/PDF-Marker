import { Injectable } from '@angular/core';
import {isNil} from "lodash";
import {PdfmConstants} from "@shared/constants/pdfm.constants";

@Injectable({
  providedIn: 'root'
})
export class PdfmUtilsService {

  constructor() { }

  /**
   * @param {String} path Absolute path
   * @return {String} File name
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/lastIndexOf
   * @example basename('/home/johndoe/github/my-package/webpack.config.js') // "webpack.config.js"
   * @example basename('C:\\Users\\johndoe\\github\\my-package\\webpack.config.js') // "webpack.config.js"
   */
  public static basename(path: string): string {
    let separator = '/';

    const windowsSeparator = '\\';

    if (path.includes(windowsSeparator)) {
      separator = windowsSeparator;
    }

    return path.slice(path.lastIndexOf(separator) + 1);
  }

  /**
   * @param {String} path Absolute path
   * @return {String} File name
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/lastIndexOf
   * @example basename('/home/johndoe/github/my-package/webpack.config.js') = "/home/johndoe/github/my-package"
   * @example basename('C:\\Users\\johndoe\\github\\my-package\\webpack.config.js') = "C:\\Users\\johndoe\\github\\my-package\\"
   */
  public static dirname(path: string, levels = 1): string {
    let separator = '/';

    const windowsSeparator = '\\';

    if (path.includes(windowsSeparator)) {
      separator = windowsSeparator;
    }
    const lastIndex = path.lastIndexOf(separator);
    if (lastIndex < 0) {
      // There is no more parents
      return undefined;
    }
    const dirname = path.slice(0, lastIndex);
    if (levels > 1) {
      return PdfmUtilsService.dirname(dirname, --levels);
    } else {
      return dirname;
    }
  }

  public static isDefaultWorkspace(workspaceName: string): boolean{
    return isNil(workspaceName) || workspaceName === PdfmConstants.DEFAULT_WORKSPACE;
  }

  public static defaultWorkspaceName(workspaceName?: string): string{
    if (isNil(workspaceName)) {
      return PdfmConstants.DEFAULT_WORKSPACE;
    }
    return workspaceName;
  }

  public static buildFilePath(workspaceName: string, assignmentName: string, ...paths: string[]): string{
    let finalPath = assignmentName + '/' + paths.join('/');
    if (!isNil(workspaceName) && workspaceName !== PdfmConstants.DEFAULT_WORKSPACE){
      finalPath = workspaceName + '/' + finalPath;
    }
    return finalPath;
  }
}
