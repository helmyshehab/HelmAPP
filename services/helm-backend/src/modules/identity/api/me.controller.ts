import { Controller, Get, Inject } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AppException } from '../../../common/errors/app.exception';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import { GetMeUseCase } from '../application/get-me.use-case';

@Controller()
export class MeController {
  constructor(@Inject(GetMeUseCase) private readonly getMe: GetMeUseCase) {}

  @Get('me')
  me(@CurrentUser() user: AuthPrincipal | undefined) {
    if (!user) {
      throw AppException.unauthorized('Authentication required');
    }
    return this.getMe.execute(user);
  }
}
