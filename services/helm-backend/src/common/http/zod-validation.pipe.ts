import { PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';
import { AppException } from '../errors/app.exception';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      throw AppException.validation(detail);
    }
    return result.data;
  }
}
