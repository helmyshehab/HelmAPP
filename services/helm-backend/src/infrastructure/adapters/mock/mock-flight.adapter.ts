import { Injectable } from '@nestjs/common';
import type { FlightPort, FlightQuote, FlightQuoteRequest } from '../../ports/flight.port';

/**
 * MOCK flight adapter — static demo quotes for local MVP.
 * Real flight integrations require Helmy approval (BD-04).
 */
@Injectable()
export class MockFlightAdapter implements FlightPort {
  async quote(request: FlightQuoteRequest): Promise<FlightQuote[]> {
    return [
      {
        provider: 'mock',
        summary: `MOCK ${request.originCode} → ${request.destinationCode} on ${request.departDate}`,
        amountEgp: '12500.00',
      },
    ];
  }
}
