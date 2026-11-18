import { HttpException, HttpStatus } from '@nestjs/common';

export type ProblemCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'NOT_READY'
  | 'BAD_REQUEST';

export class AppException extends HttpException {
  readonly code: ProblemCode;
  readonly type: string;
  readonly title: string;
  readonly detail?: string;

  constructor(input: {
    status: HttpStatus;
    code: ProblemCode;
    title: string;
    detail?: string;
    type?: string;
  }) {
    super(
      {
        type: input.type ?? `https://helm.app/errors/${input.code.toLowerCase().replace(/_/g, '-')}`,
        title: input.title,
        status: input.status,
        detail: input.detail,
        code: input.code,
      },
      input.status,
    );
    this.code = input.code;
    this.type = input.type ?? `https://helm.app/errors/${input.code.toLowerCase().replace(/_/g, '-')}`;
    this.title = input.title;
    this.detail = input.detail;
  }

  static unauthorized(detail = 'Authentication required') {
    return new AppException({
      status: HttpStatus.UNAUTHORIZED,
      code: 'UNAUTHORIZED',
      title: 'Unauthorized',
      detail,
    });
  }

  static forbidden(detail = 'Insufficient permissions') {
    return new AppException({
      status: HttpStatus.FORBIDDEN,
      code: 'FORBIDDEN',
      title: 'Forbidden',
      detail,
    });
  }

  static validation(detail: string) {
    return new AppException({
      status: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_FAILED',
      title: 'Validation failed',
      detail,
    });
  }

  static notFound(detail = 'Resource not found') {
    return new AppException({
      status: HttpStatus.NOT_FOUND,
      code: 'NOT_FOUND',
      title: 'Not found',
      detail,
    });
  }
}
