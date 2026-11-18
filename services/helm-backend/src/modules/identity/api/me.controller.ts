import { Controller, Get, Inject } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import { GetMeUseCase } from '../application/get-me.use-case';

@Controller()
export class MeController {
  constructor(@Inject(GetMeUseCase) private readonly getMe: GetMeUseCase) {}

  @Get('me')
  me(@CurrentUser() user: AuthPrincipal) {
    return this.getMe.execute(user);
  }
}
