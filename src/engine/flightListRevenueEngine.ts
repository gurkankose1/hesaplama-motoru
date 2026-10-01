import type { Airport, FlightScenario, TariffVersion } from '../types/tariff';
import type { FlightListSummary, FlightRecord, FlightRevenueResult, RevenueOptions } from '../types/flightList';
import { getAirlineHabit } from './airlineHabitsData';
import { calculateScenarioFees } from './calculatorEngine';

export const DEFAULT_REVENUE_OPTIONS: RevenueOptions = {
  includeLanding: true,
  includeParking: true,
  includeApproach: true,
  includeLighting: true,
  includePaxSvcSec: true,
  includeBridgePbb: true,
  includeGpu: true,
  includePca: true,
  includeWater: true,
  includeVdgs: true,
  includeArff: true,
  includeFollowMe: true,
  includeGroundHandling: true,
};

// Helper: Classify stand area as Bridge Stand vs Open / Remote Stand
export function classifyStandArea(standAreaName?: string, standNo?: string): { isBridgeStand: boolean; isOpenStand: boolean } {
  const sa = (standAreaName || '').toUpperCase();
  const st = (standNo || '').toUpperCase();

  // Explicit Open / Remote Stand areas
  if (
    sa.includes('APRON') ||
    sa.includes('CARGO') ||
    sa.includes('DEICING') ||
    sa.includes('AÇIK') ||
    sa.includes('ACIK')
  ) {
    return { isBridgeStand: false, isOpenStand: true };
  }

  // Concourse A..G = Bridge Stands
  if (
    sa.includes('CONCOURSE') ||
    sa.startsWith('A') || sa.startsWith('B') || sa.startsWith('C') ||
    sa.startsWith('D') || sa.startsWith('E') || sa.startsWith('F') || sa.startsWith('G') ||
    st.startsWith('A') || st.startsWith('B') || st.startsWith('C') ||
    st.startsWith('D') || st.startsWith('E') || st.startsWith('F') || st.startsWith('G')
  ) {
    return { isBridgeStand: true, isOpenStand: false };
  }

  // Default fallback based on numeric vs letter prefix
  const firstChar = (st || sa).charAt(0);
  if (firstChar >= 'A' && firstChar <= 'G') {
    return { isBridgeStand: true, isOpenStand: false };
  }

  return { isBridgeStand: false, isOpenStand: true };
}

// Calculate revenue for a single flight record
export function calculateFlightRevenue(
  flight: FlightRecord,
  selectedAirport: Airport,
  exchangeRateEUR: number,
  options: RevenueOptions = DEFAULT_REVENUE_OPTIONS,
  tariffVersion?: TariffVersion,
  customUsageMap?: {
    gpu?: Record<string, number>;
    pca?: Record<string, number>;
    pbb?: Record<string, number>;
    water?: Record<string, number>;
  }
): FlightRevenueResult {
  const notes: string[] = [];

  // 1. Cancelled Flight Check (Status DX)
  if (flight.isCancelled) {
    return {
      flight,
      groundTimeHours: 0,
      pbbMinsUsed: 0,
      gpuMinsUsed: 0,
      pcaMinsUsed: 0,
      waterCountUsed: 0,
      vdgsCountUsed: 0,
      usedHabitsFallback: false,
      notes: ['❌ İptal Edilen Uçuş (Status: DX) - Kapsam Dışı'],
      subtotalEUR: 0,
      subtotalTRY: 0,
      totalConvertedTRY: 0,
      lineItems: [],
    };
  }

  // 2. Derive Ground Time Hours
  let groundTimeHours = 2.0; // Default 2h
  if (flight.onBlock && flight.offBlock) {
    const ob = new Date(flight.onBlock).getTime();
    const offb = new Date(flight.offBlock).getTime();
    if (!isNaN(ob) && !isNaN(offb) && offb > ob) {
      groundTimeHours = Math.round(((offb - ob) / (1000 * 60 * 60)) * 10) / 10;
    }
  } else if (flight.ata && flight.atd) {
    const a = new Date(flight.ata).getTime();
    const d = new Date(flight.atd).getTime();
    if (!isNaN(a) && !isNaN(d) && d > a) {
      groundTimeHours = Math.round(((d - a) / (1000 * 60 * 60)) * 10) / 10;
    }
  }

  const groundTimeMins = Math.round(groundTimeHours * 60);

  // 3. Stand Classification & Equipment Multipliers
  const { isBridgeStand, isOpenStand } = classifyStandArea(flight.standArea, flight.stand);
  flight.isBridgeStand = isBridgeStand;
  flight.isOpenStand = isOpenStand;

  // Equipment Category Sizing (C, D, E, F)
  const cat = (flight.aircraftCategory || 'C').toUpperCase();
  let bridgeCount = 1;
  let gpuCableCount = 1;
  let pcaDuctCount = 1;

  if (cat === 'D' || cat === 'E') {
    // Widebody
    bridgeCount = 2;
    gpuCableCount = 2;
    pcaDuctCount = 2;
  } else if (cat === 'F') {
    // Super Widebody (A380 / B747-8)
    bridgeCount = 3;
    gpuCableCount = 4;
    pcaDuctCount = 4;
  }

  // 4. Usage Minutes Determination
  let pbbMinsUsed = 0;
  let gpuMinsUsed = 0;
  let pcaMinsUsed = 0;
  let waterCountUsed = 0;
  let vdgsCountUsed = 0;
  let usedHabitsFallback = false;

  if (isOpenStand) {
    // OPEN STAND RULE: "Açık pozisyonlarda pbb, pca, gpu, vdgs, water hizmeti vermiyoruz."
    notes.push('🅿️ Açık Pozisyon Parkı (Remote Stand) - PBB, GPU, PCA, VDGS ve Su Hizmetleri Uygulanmaz.');
  } else {
    // BRIDGE STAND: Check custom actual usage or pre-trained airline habits
    const habit = getAirlineHabit(flight.airline);
    
    // Check if custom actual usage file provided
    const fKey = `${flight.arrFlightNo}_${flight.regNo}_${flight.stand}`;
    
    if (customUsageMap?.pbb?.[fKey] !== undefined) {
      pbbMinsUsed = customUsageMap.pbb[fKey];
    } else {
      pbbMinsUsed = Math.min(groundTimeMins, habit.pbbMins);
      usedHabitsFallback = true;
    }

    if (customUsageMap?.gpu?.[fKey] !== undefined) {
      gpuMinsUsed = customUsageMap.gpu[fKey];
    } else {
      gpuMinsUsed = Math.min(groundTimeMins, habit.gpuMins);
      usedHabitsFallback = true;
    }

    if (customUsageMap?.pca?.[fKey] !== undefined) {
      pcaMinsUsed = customUsageMap.pca[fKey];
    } else {
      pcaMinsUsed = Math.min(groundTimeMins, habit.pcaMins);
      usedHabitsFallback = true;
    }

    if (customUsageMap?.water?.[fKey] !== undefined) {
      waterCountUsed = customUsageMap.water[fKey];
    } else {
      waterCountUsed = habit.waterRefills || 1;
      usedHabitsFallback = true;
    }

    vdgsCountUsed = 1; // Always 1 time on block

    notes.push(
      `🌉 Köprülü Park (${flight.standArea} ${flight.stand}) - ${flight.airline} Alışkanlıkları: ` +
      `PBB: ${pbbMinsUsed} dk, GPU: ${gpuMinsUsed} dk (${gpuCableCount} Kablo), ` +
      `PCA: ${pcaMinsUsed} dk (${pcaDuctCount} Kanal), Su: ${waterCountUsed} İkmal.`
    );
  }

  // 5. Construct FlightScenario object for calculatorEngine
  const scenario: FlightScenario = {
    id: flight.id,
    title: `${flight.airline} - ${flight.arrFlightNo}/${flight.depFlightNo}`,
    aircraftType: flight.aircraftType || 'Airbus A320',
    mtow: flight.mtowTon || 79,
    seats: 180, // Default seat estimate based on category
    passengerCount: Math.max(0, flight.depPax || flight.arrPax || 0),
    petcCount: 0,
    avihCount: 0,
    flightCategory: flight.flightCategory,
    arrivalTime: flight.ata || flight.sta || '',
    departureTime: flight.atd || flight.std || '',
    parkingHours: groundTimeHours,
    isOvernightStay: groundTimeHours > 24,
    isBridgeOvernightStay: false,
    nightLanding: false,
    nightTakeoff: false,
    isTechnicalLanding: false,
    isSeasonalDiscountApplicable: false,
    arffHours: 0,
    followMeCount: flight.towCount || 1,
    airportExtensionHours: 0,
    bridgeHours: isOpenStand ? 0 : Math.ceil(pbbMinsUsed / 60),
    bridgeCount: bridgeCount,
    bridge400HzMinutes: isOpenStand ? 0 : gpuMinsUsed,
    gpuCableCount: gpuCableCount,
    bridgePcaMinutes: isOpenStand ? 0 : pcaMinsUsed,
    pcaDuctCount: pcaDuctCount,
    waterServiceCount: isOpenStand ? 0 : waterCountUsed,
    bridgeWaterUse: !isOpenStand && waterCountUsed > 0,
    bridgeVdgsUse: !isOpenStand,
    quantity: 1,
    enabledServices: {
      landing: options.includeLanding,
      parking: options.includeParking,
      approach: options.includeApproach,
      lighting: options.includeLighting,
      passengerService: options.includePaxSvcSec,
      passengerSecurity: options.includePaxSvcSec,
      bridge: options.includeBridgePbb && !isOpenStand,
      bridge400Hz: options.includeGpu && !isOpenStand,
      bridgePca: options.includePca && !isOpenStand,
      bridgeWater: options.includeWater && !isOpenStand,
      bridgeVdgs: options.includeVdgs && !isOpenStand,
      arffSafety: options.includeArff,
      followMe: options.includeFollowMe,
      airportExtension: false,
      ghRamp: options.includeGroundHandling,
      ghPaxSvc: options.includeGroundHandling,
      ghLoadCtrl: options.includeGroundHandling,
    },
  };

  // 6. Calculate exact line items using calculatorEngine
  const calcResult = calculateScenarioFees(scenario, selectedAirport, exchangeRateEUR, tariffVersion);

  return {
    flight,
    groundTimeHours,
    pbbMinsUsed,
    gpuMinsUsed,
    pcaMinsUsed,
    waterCountUsed,
    vdgsCountUsed,
    usedHabitsFallback,
    notes,
    subtotalEUR: calcResult.subtotalEUR,
    subtotalTRY: calcResult.subtotalTRY,
    totalConvertedTRY: calcResult.totalConvertedTRY,
    lineItems: calcResult.lineItems.filter((item) => item.enabled),
  };
}

// Calculate summary across an entire imported flight list
export function calculateFlightListSummary(
  flights: FlightRecord[],
  selectedAirport: Airport,
  exchangeRateEUR: number,
  options: RevenueOptions = DEFAULT_REVENUE_OPTIONS,
  tariffVersion?: TariffVersion
): FlightListSummary {
  const results: FlightRevenueResult[] = [];
  let executedFlights = 0;
  let cancelledFlights = 0;
  let bridgeStandFlights = 0;
  let openStandFlights = 0;
  let totalPassengers = 0;
  let totalSubtotalEUR = 0;
  let totalSubtotalTRY = 0;
  let totalConvertedTRY = 0;

  flights.forEach((flight) => {
    const rev = calculateFlightRevenue(flight, selectedAirport, exchangeRateEUR, options, tariffVersion);
    results.push(rev);

    if (flight.isCancelled) {
      cancelledFlights++;
    } else {
      executedFlights++;
      if (flight.isBridgeStand) bridgeStandFlights++;
      if (flight.isOpenStand) openStandFlights++;

      totalPassengers += Math.max(0, flight.depPax || flight.arrPax || 0);
      totalSubtotalEUR += rev.subtotalEUR;
      totalSubtotalTRY += rev.subtotalTRY;
      totalConvertedTRY += rev.totalConvertedTRY;
    }
  });

  return {
    totalFlights: flights.length,
    executedFlights,
    cancelledFlights,
    bridgeStandFlights,
    openStandFlights,
    totalPassengers,
    totalSubtotalEUR,
    totalSubtotalTRY,
    totalConvertedTRY,
    exchangeRateEUR,
    byAirportName: selectedAirport.name,
    results,
  };
}
