import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
  mixin,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { AppException } from '../../../common/errors/app.exception';
import { CATALOG_COVER_MAX_BYTES } from '../../../infrastructure/ports/storage.port';

/** Multipart wrapper overhead for fields + boundaries (not the image itself). */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

/**
 * Reject oversized multipart requests via Content-Length before multer buffers,
 * then enforce streaming fileSize via multer limits.
 */
export function CatalogCoverUploadInterceptor(
  fieldName = 'file',
): Type<NestInterceptor> {
  @Injectable()
  class MixedInterceptor implements NestInterceptor {
    private readonly fileInterceptor = new (FileInterceptor(fieldName, {
      limits: {
        fileSize: CATALOG_COVER_MAX_BYTES,
        files: 1,
      },
    }))();

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<unknown>> {
      const req = context.switchToHttp().getRequest<Request>();
      const raw = req.headers['content-length'];
      if (raw) {
        const length = Number(raw);
        if (
          Number.isFinite(length) &&
          length > CATALOG_COVER_MAX_BYTES + MULTIPART_OVERHEAD_BYTES
        ) {
          throw AppException.validation(
            `Cover upload exceeds maximum size of ${CATALOG_COVER_MAX_BYTES} bytes (5 MiB)`,
          );
        }
      }
      return this.fileInterceptor.intercept(context, next);
    }
  }

  return mixin(MixedInterceptor);
}
