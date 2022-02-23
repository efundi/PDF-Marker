import { Injectable } from '@angular/core';

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
}
