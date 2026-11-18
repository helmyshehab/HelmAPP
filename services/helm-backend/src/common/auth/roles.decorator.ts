import { SetMetadata } from '@nestjs/common';
import type { AppRole } from '../../infrastructure/ports/auth.port';

export const ROLES_KEY = 'helm:roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
