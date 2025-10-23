/**
 * Logger utility for AutoPin
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string = 'AutoPin', level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[${this.prefix}] [DEBUG]`, ...args);
    }
  }

  info(...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[${this.prefix}] [INFO]`, ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[${this.prefix}] [WARN]`, ...args);
    }
  }

  error(...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[${this.prefix}] [ERROR]`, ...args);
    }
  }

  success(...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[${this.prefix}] [SUCCESS] ✅`, ...args);
    }
  }
}

export const logger = new Logger();


