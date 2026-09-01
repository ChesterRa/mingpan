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
      // 第三方计算库的异常消息可能回显出生参数。远程 MCP 默认只记录
      // 错误类别与稳定错误码，避免姓名、日期、时间、地点落入平台日志。
      const errorRecord = error && typeof error === 'object'
        ? error as { name?: unknown; code?: unknown }
        : undefined;
      const errorData = {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        ...(typeof errorRecord?.code === 'string' || typeof errorRecord?.code === 'number'
          ? { errorCode: errorRecord.code }
          : {}),
        ...((data && typeof data === 'object') ? data : {})
      };
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

export default Logger;
