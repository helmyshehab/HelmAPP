import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StructuredLogger } from '../logging/structured-logger';
import { AppException } from './app.exception';

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
  request_id?: string;
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(@Optional() @Inject(StructuredLogger) private readonly logger?: StructuredLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId;

    const problem = this.toProblem(exception, requestId);
    this.logger?.error(
      {
        msg: 'request_failed',
        status: problem.status,
        code: problem.code,
        path: req.originalUrl,
        request_id: requestId,
      },
      undefined,
      'ProblemDetailsFilter',
    );

    res.status(problem.status);
    res.setHeader('Content-Type', 'application/problem+json');
    res.json(problem);
  }

  private toProblem(exception: unknown, requestId?: string): ProblemDetails {
    if (exception instanceof AppException) {
      const body = exception.getResponse() as ProblemDetails;
      return { ...body, request_id: requestId };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const detail =
        typeof response === 'string'
          ? response
          : typeof response === 'object' && response && 'message' in response
            ? Array.isArray((response as { message: unknown }).message)
              ? ((response as { message: string[] }).message).join('; ')
              : String((response as { message: unknown }).message)
            : exception.message;

      const code =
        status === HttpStatus.UNAUTHORIZED
          ? 'UNAUTHORIZED'
          : status === HttpStatus.FORBIDDEN
            ? 'FORBIDDEN'
            : status === HttpStatus.NOT_FOUND
              ? 'NOT_FOUND'
              : status === HttpStatus.BAD_REQUEST
                ? 'BAD_REQUEST'
                : 'INTERNAL_ERROR';

      return {
        type: `https://helm.app/errors/${code.toLowerCase().replace(/_/g, '-')}`,
        title: HttpStatus[status] ?? 'Error',
        status,
        detail,
        code,
        request_id: requestId,
      };
    }

    const detail =
      exception instanceof Error ? exception.message : 'An unexpected error occurred';
    this.logger?.error(
      {
        msg: 'unhandled_exception',
        detail,
        stack: exception instanceof Error ? exception.stack : undefined,
      },
      undefined,
      'ProblemDetailsFilter',
    );
    return {
      type: 'https://helm.app/errors/internal-error',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      request_id: requestId,
    };
  }
}
