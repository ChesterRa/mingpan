/**
 * Simple logger for MCP service
 * Replaces the complex logger from baziwei that had React/Next.js dependencies
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Default log level from environment or 'info'
const currentLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

/**
 * Simple Logger class
 * Exported as both a class (for typing) and used to create instances
 */
export class Logger {
  private context: string;
  private minLevel: number;

  constructor(context: string = 'mingpan') {
    this.context = context;
    this.minLevel = LOG_LEVELS[currentLevel] ?? 1;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${dataStr}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      this.write('debug', this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      this.write('info', this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      this.write('warn', this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: unknown, data?: unknown): void {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error
        ? { message: error.message, stack: error.stack, ...((data && typeof data === 'object') ? data : {}) }
        : { error, ...((data && typeof data === 'object') ? data : {}) };
      this.write('error', this.formatMessage('error', message, errorData));
    }
  }

  /**
   * 所有日志一律寫 stderr：stdio MCP 服務器的 stdout
   * 必須是純 JSON-RPC 流，任何混入都會破壞客戶端解析
   */
  private write(level: LogLevel, line: string): void {
    if (typeof process !== 'undefined' && process.stderr && typeof process.stderr.write === 'function') {
      process.stderr.write(line + '\n');
    } else {
      console.error(line);
    }
  }
}

/**
 * Factory function to create logger instances
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Log masker for sensitive data
 * Provides methods to mask PII and sensitive information in logs
 */
export const LogMasker = {
  /**
   * Mask a name - keep first character, mask the rest
   */
  maskName(name: string): string {
    if (!name || name.length < 2) return '***';
    return name[0] + '*'.repeat(name.length - 1);
  },

  /**
   * Mask a date - keep year and month, mask day
   */
  maskDate(date: string): string {
    // Only mask day part: YYYY-MM-DD -> YYYY-MM-**
    if (!date || date.length < 10) return '****-**-**';
    return date.slice(0, 8) + '**';
  },

  /**
   * Mask a time - keep hour, mask minutes
   */
  maskTime(time: string): string {
    // Keep hour, mask minutes: HH:mm -> HH:**
    if (!time || time.length < 5) return '**:**';
    return time.slice(0, 3) + '**';
  },

  /**
   * Mask an object's sensitive fields
   * @param obj - The object to mask
   * @param sensitiveKeys - Array of keys to mask
   * @returns A new object with sensitive fields masked
   */
  maskObject<T extends object>(obj: T, sensitiveKeys: string[]): Record<string, unknown> {
    if (!obj || typeof obj !== 'object') return obj as unknown as Record<string, unknown>;

    const result: Record<string, unknown> = { ...(obj as Record<string, unknown>) };

    for (const key of sensitiveKeys) {
      if (key in result && result[key] !== undefined) {
        const value = result[key];
        if (typeof value === 'string') {
          // Apply appropriate masking based on key name
          if (key.toLowerCase().includes('name')) {
            result[key] = this.maskName(value);
          } else if (key.toLowerCase().includes('date')) {
            result[key] = this.maskDate(value);
          } else if (key.toLowerCase().includes('time')) {
            result[key] = this.maskTime(value);
          } else {
            // Generic masking: show first 2 chars
            result[key] = value.length > 2 ? value.slice(0, 2) + '***' : '***';
          }
        } else {
          result[key] = '[MASKED]';
        }
      }
    }

    return result;
  }
};

export default Logger;
