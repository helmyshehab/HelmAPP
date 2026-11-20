import { Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AppException } from '../../../common/errors/app.exception';
import type { AuthPrincipal } from '../../../infrastructure/ports/auth.port';
import { BootstrapCustomerProfileUseCase } from '../application/bootstrap-customer-profile.use-case';

@Controller('customer/profile')
export class CustomerProfileController {
  constructor(
    @Inject(BootstrapCustomerProfileUseCase)
    private readonly bootstrap: BootstrapCustomerProfileUseCase,
  ) {}

  @Post('bootstrap')
  @HttpCode(HttpStatus.OK)
  bootstrapProfile(@CurrentUser() user: AuthPrincipal | undefined) {
    if (!user) {
      throw AppException.unauthorized('Authentication required');
    }
    return this.bootstrap.execute(user);
  }
}
