type LoggerMethods =
  | 'debug'
  | 'log'
  | 'warn'
  | 'error'
  | 'groupCollapsed'
  | 'groupEnd';


(window as any).logLevel = 'warn';

(window as any).debug = () => {
  console.log('Setting debug log level');
  (window as any).logLevel = 'debug';
  (window as unknown as any).applicationApi.debug()
}


const LEVEL_MAP = {
  debug: 0,
  log: 1,
  warn: 2,
  error: 2
}

export interface Logger{
  debug(...args: unknown[]): void
  log(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}
const methodToColorMap: {[methodName: string]: string | null} = {
  debug: `#7f8c8d`, // Gray
  log: `#2ecc71`, // Green
  warn: `#f39c12`, // Yellow
  error: `#c0392b`, // Red
};

function isLevelActive(level: string): boolean {
  const current = LEVEL_MAP[(window as any).logLevel]
  const l = LEVEL_MAP[level]
  return l >= current
}

export function createLogger(name: string): Logger {

  let inGroup = false;

  const print = function (method: LoggerMethods, args: any[]) {
    if(!isLevelActive(method)){
      return;
    }


    const styles = [
      `background: ${methodToColorMap[method]!}`,
      `border-radius: 0.5em`,
      `color: white`,
      `font-weight: bold`,
      `padding: 2px 0.5em`,
    ];

    // When in a group, the workbox prefix is not displayed.
    const logPrefix = inGroup ? [] : ['%c'+name, styles.join(';')];

    console[method](...logPrefix, ...args);

    if (method === 'groupCollapsed') {
      inGroup = true;
    }
    if (method === 'groupEnd') {
      inGroup = false;
    }
  };
  // eslint-disable-next-line @typescript-eslint/ban-types
  const api: {[methodName: string]: Function} = {};
  const loggerMethods = Object.keys(methodToColorMap);

  for (const key of loggerMethods) {
    const method = key as LoggerMethods;

    api[method] = (...args: unknown[]) => {
      print(method, args);
    };
  }
  return api as unknown as Logger
}
