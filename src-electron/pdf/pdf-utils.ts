
export const adjustPointsForResults = (coordinate: number, change: number): number => {
  return coordinate - (change);
};


/**
 * https://github.com/sindresorhus/rgb-hex/blob/main/index.js
 * @param red
 * @param green
 * @param blue
 * @param alpha
 */
export function rgbHex(red, green?, blue?, alpha?) {
  const isPercent = (red + (alpha || '')).toString().includes('%');

  if (typeof red === 'string') {
    [red, green, blue, alpha] = red.match(/(0?\.?\d{1,3})%?\b/g).map(component => Number(component));
  } else if (alpha !== undefined) {
    alpha = Number.parseFloat(alpha);
  }

  if (typeof red !== 'number' ||
    typeof green !== 'number' ||
    typeof blue !== 'number' ||
    red > 255 ||
    green > 255 ||
    blue > 255
  ) {
    throw new TypeError('Expected three numbers below 256');
  }

  if (typeof alpha === 'number') {
    if (!isPercent && alpha >= 0 && alpha <= 1) {
      alpha = Math.round(255 * alpha);
    } else if (isPercent && alpha >= 0 && alpha <= 100) {
      alpha = Math.round(255 * alpha / 100);
    } else {
      throw new TypeError(`Expected alpha value (${alpha}) as a fraction or percentage`);
    }

    // tslint:disable-next-line:no-bitwise
    alpha = (alpha | 1 << 8).toString(16).slice(1); // eslint-disable-line no-mixed-operators
  } else {
    alpha = '';
  }

  // tslint:disable-next-line:no-bitwise
  return ((blue | green << 8 | red << 16) | 1 << 24).toString(16).slice(1) + alpha;
}



const hexCharacters = 'a-f\\d';
const match3or4Hex = `#?[${hexCharacters}]{3}[${hexCharacters}]?`;
const match6or8Hex = `#?[${hexCharacters}]{6}([${hexCharacters}]{2})?`;
const nonHexChars = new RegExp(`[^#${hexCharacters}]`, 'gi');
const validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, 'i');

export interface RgbaObject {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export type RgbaTuple = [
  red: number,
  green: number,
  blue: number,
  alpha: number
];

// https://github.com/sindresorhus/hex-rgb
export function hexRgb(hex, options: any = {}): RgbaObject {
  if (typeof hex !== 'string' || nonHexChars.test(hex) || !validHexSize.test(hex)) {
    throw new TypeError('Expected a valid hex string');
  }

  hex = hex.replace(/^#/, '');
  let alphaFromHex = 1;

  if (hex.length === 8) {
    alphaFromHex = Number.parseInt(hex.slice(6, 8), 16) / 255;
    hex = hex.slice(0, 6);
  }

  if (hex.length === 4) {
    alphaFromHex = Number.parseInt(hex.slice(3, 4).repeat(2), 16) / 255;
    hex = hex.slice(0, 3);
  }

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const number = Number.parseInt(hex, 16);
  // tslint:disable:no-bitwise
  const red = number >> 16;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  const alpha = typeof options.alpha === 'number' ? options.alpha : alphaFromHex;

  return {red, green, blue, alpha};
}
