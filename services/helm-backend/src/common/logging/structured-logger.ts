import { Injectable, LoggerService, Optional, Inject } from '@nestjs/common';
import { APP_ENV, type AppEnv } from '../../infrastructure/config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

@Injectable()
export class StructuredLogger implements LoggerService {
  private context?: string;
  private readonly minLevel: LogLevel;

  constructor(@Optional() @Inject(APP_ENV) env?: AppEnv) {
    this.minLevel = env?.LOG_LEVEL ?? 'info';
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: unknown, context?: string) {
    this.write('info', message, context);
  }

  info(message: unknown, context?: string) {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace ? { trace } : undefined);
  }

  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write('debug', message, context);
  }

  child(fields: Record<string, unknown>) {
    const parent = this;
    return {
      info: (message: unknown) => parent.write('info', message, parent.context, fields),
      warn: (message: unknown) => parent.write('warn', message, parent.context, fields),
      error: (message: unknown) => parent.write('error', message, parent.context, fields),
      debug: (message: unknown) => parent.write('debug', message, parent.context, fields),
    };
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    extra?: Record<string, unknown>,
  ) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;
    const entry = {
      level,
      time: new Date().toISOString(),
      context: context ?? this.context ?? 'helm-backend',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      ...extra,
    };
    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}
