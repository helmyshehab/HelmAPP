import { Global, Module } from '@nestjs/common';
import { MockAiAdapter } from './adapters/mock/mock-ai.adapter';
import { MockFlightAdapter } from './adapters/mock/mock-flight.adapter';
import { MockNotifyAdapter } from './adapters/mock/mock-notify.adapter';
import { MockPaymentAdapter } from './adapters/mock/mock-payment.adapter';

/**
 * Wires local MOCK provider adapters by default (Gate 3 — unpaid local MVP).
 */
@Global()
@Module({
  providers: [
    { provide: 'PaymentPort', useClass: MockPaymentAdapter },
    { provide: 'AiPort', useClass: MockAiAdapter },
    { provide: 'FlightPort', useClass: MockFlightAdapter },
    { provide: 'NotifyPort', useClass: MockNotifyAdapter },
    MockPaymentAdapter,
    MockAiAdapter,
    MockFlightAdapter,
    MockNotifyAdapter,
  ],
  exports: ['PaymentPort', 'AiPort', 'FlightPort', 'NotifyPort'],
})
export class InfrastructureModule {}
