export type FlightCategory = 'INTERNATIONAL' | 'DOMESTIC';
export type AirportTier = 'IST_PPP' | 'TIER_1' | 'TIER_2';

export interface Airport {
  id: string;
  name: string;
  code: string;
  tier: AirportTier;
  city: string;
  isPpp: boolean;
}

export interface AircraftPreset {
  id: string;
  name: string; // e.g. "Airbus A320-200"
  category: 'Commercial Passenger' | 'Commercial Cargo' | 'General Aviation / Private';
  defaultMtow: number; // In metric tons
  defaultSeats: number;
}

export interface ServiceLineItem {
  id: string;
  category: 'Konma & Konaklama' | 'Yolcu Hizmetleri' | 'Operasyonel & Emniyet' | 'Köprü & Ekipman' | 'Yer Hizmetleri';
  name: string;
  description: string;
  currency: 'EUR' | 'TRY';
  unitPrice: number;
  quantity: number;
  total: number;
  enabled: boolean;
  notes?: string;
}

export interface FlightScenario {
  id: string;
  title: string;
  aircraftType: string;
  mtow: number; // metric tons
  seats: number;
  passengerCount: number;
  petcCount: number; // Pets in cabin (%30 pax fee)
  avihCount: number; // Pets in hold (%50 pax fee)
  flightCategory: FlightCategory;
  
  // Timings & Operations (Arrival & Departure Date-Times)
  arrivalTime: string; // ISO datetime e.g. "2026-08-26T10:00"
  departureTime: string; // ISO datetime e.g. "2026-08-26T14:00"
  parkingHours: number; // Derived or manual
  
  // Overnight / Prolonged Parking & Discounts
  isOvernightStay: boolean; // Yatı uçağı (2. gün %200, 3. gün %300, 3+ gün %500 zam)
  isBridgeOvernightStay: boolean; // Körükte zorunlu yatı kalma (%50 indirimli köprü ücreti)
  
  nightLanding: boolean;
  nightTakeoff: boolean;
  isTechnicalLanding: boolean;
  isSeasonalDiscountApplicable: boolean;
  arffHours: number;
  followMeCount: number;
  airportExtensionHours: number;
  
  // Passenger Bridge (Körük) & Multi-Bridge / Multi-Cable Utilities
  bridgeHours: number;
  bridgeCount: number; // 1, 2, or 3 bridges (Madde 3.k: 2. ve 3. köprü için %20 ilave)
  
  bridge400HzMinutes: number;
  gpuCableCount: number; // 1, 2, 3, or 4 cables (Madde 3.f: 2 kablo %50, 3 kablo %100, 4 kablo %150 zam)
  
  bridgePcaMinutes: number;
  pcaDuctCount: number; // 1, 2, 3, or 4 ducts (Madde 3.f: 2 kanal %50, 3 kanal %100, 4 kanal %150 zam)
  
  waterServiceCount: number; // 1, 2, 3, or 4 water refill services
  bridgeWaterUse: boolean;
  bridgeVdgsUse: boolean;
  
  // Quantities & Enabled Services
  quantity: number; // Multi-aircraft fleet count!
  enabledServices: Record<string, boolean>; // Service ID -> boolean toggle
}

export interface FeeCalculationResult {
  scenarioId: string;
  quantity: number;
  lineItems: ServiceLineItem[];
  subtotalEUR: number;
  subtotalTRY: number;
  totalConvertedTRY: number;
  perAircraftEUR: number;
  perAircraftTRY: number;
  perAircraftConvertedTRY: number;
}

export interface FleetSummaryResult {
  totalFlights: number;
  totalAircraftCount: number;
  totalPassengers: number;
  totalSubtotalEUR: number;
  totalSubtotalTRY: number;
  totalConvertedTRY: number;
  exchangeRateEUR: number;
  byCategory: {
    category: string;
    amountEUR: number;
    amountTRY: number;
    convertedTRY: number;
  }[];
  byAirportName: string;
  resultsByScenario: FeeCalculationResult[];
}

export interface TariffVersion {
  id: string;
  name: string;
  effectiveDate: string;
  revision: string;
  sourcePdfName?: string;
  data: any; // Raw tariff JSON configuration
}
