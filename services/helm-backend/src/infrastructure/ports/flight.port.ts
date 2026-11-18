export type FlightQuoteRequest = {
  originCode: string;
  destinationCode: string;
  departDate: string;
};

export type FlightQuote = {
  provider: string;
  summary: string;
  amountEgp: string;
};

/** Port for flight sources. Real GDS/partners require Helmy approval (BD-04). */
export interface FlightPort {
  quote(request: FlightQuoteRequest): Promise<FlightQuote[]>;
}
