/**
 * Centralized logging utility
 */

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...args: any[]): void {
    console.log(`[${this.context}] ${message}`, ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(`[${this.context}] ✅ ${message}`, ...args);
  }

  warning(message: string, ...args: any[]): void {
    console.warn(`[${this.context}] ⚠️  ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[${this.context}] ❌ ${message}`, ...args);
  }

  progress(message: string, ...args: any[]): void {
    console.log(`[${this.context}] ⏳ ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.log(`[${this.context}] 🐛 ${message}`, ...args);
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
