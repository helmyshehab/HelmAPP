import { Injectable, Logger } from '@nestjs/common';
import type { NotifyMessage, NotifyPort } from '../../ports/notify.port';

/**
 * MOCK / console notify adapter — logs instead of sending email/SMS/push.
 * Paid SMS/email providers require Helmy approval.
 */
@Injectable()
export class MockNotifyAdapter implements NotifyPort {
  private readonly logger = new Logger('MockNotifyAdapter');

  async send(message: NotifyMessage): Promise<void> {
    this.logger.log(
      `MOCK notify [${message.channel}] template=${message.templateKey} to=${message.to}`,
    );
  }
}
