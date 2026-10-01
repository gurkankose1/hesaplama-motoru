import type { ServiceLineItem } from './tariff';

export interface RawUsageUsageRecord {
  airlineName: string;
  aircraftType: string;
  stand: string;
  flightNo: string;
  usageMinutes: number;
}

export interface FlightRecord {
  id: string;
  airline: string;
  arrFlightNo: string;
  depFlightNo: string;
  regNo: string;
  aircraftType: string;
  aircraftCategory: string; // 'C', 'D', 'E', 'F', etc.
  mtowKg: number;
  mtowTon: number;
  flightCategory: 'INTERNATIONAL' | 'DOMESTIC';
  status: string; // 'OP', 'DX', etc.
  isCancelled: boolean;
  sta?: string;
  std?: string;
  ata?: string;
  atd?: string;
  onBlock?: string;
  offBlock?: string;
  standArea: string;
  stand: string;
  isBridgeStand: boolean;
  isOpenStand: boolean;
  arrPax: number;
  depPax: number;
  towCount: number;
  rawRow: any;
}

export interface FlightRevenueResult {
  flight: FlightRecord;
  groundTimeHours: number;
  pbbMinsUsed: number;
  gpuMinsUsed: number;
  pcaMinsUsed: number;
  waterCountUsed: number;
  vdgsCountUsed: number;
  usedHabitsFallback: boolean;
  notes: string[];
  subtotalEUR: number;
  subtotalTRY: number;
  totalConvertedTRY: number;
  lineItems: ServiceLineItem[];
}

export interface FlightListSummary {
  totalFlights: number;
  executedFlights: number;
  cancelledFlights: number;
  bridgeStandFlights: number;
  openStandFlights: number;
  totalPassengers: number;
  totalSubtotalEUR: number;
  totalSubtotalTRY: number;
  totalConvertedTRY: number;
  exchangeRateEUR: number;
  byAirportName: string;
  results: FlightRevenueResult[];
}

export interface RevenueOptions {
  includeLanding: boolean;
  includeParking: boolean;
  includeApproach: boolean;
  includeLighting: boolean;
  includePaxSvcSec: boolean;
  includeBridgePbb: boolean;
  includeGpu: boolean;
  includePca: boolean;
  includeWater: boolean;
  includeVdgs: boolean;
  includeArff: boolean;
  includeFollowMe: boolean;
  includeGroundHandling: boolean;
}
