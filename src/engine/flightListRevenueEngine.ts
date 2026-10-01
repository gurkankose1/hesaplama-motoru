import type { Airport, FlightScenario, TariffVersion } from '../types/tariff';
import type { FlightListSummary, FlightRecord, FlightRevenueResult, RevenueOptions } from '../types/flightList';
import { getAirlineHabit } from './airlineHabitsData';
import { calculateScenarioFees } from './calculatorEngine';
import { parseDateTime, cleanDigits } from './flightListParser';

export const DEFAULT_REVENUE_OPTIONS: RevenueOptions = {
  includeLanding: false,
  includeParking: false,
  includeApproach: false,
  includeLighting: false,
  includePaxSvcSec: false,
  includeBridgePbb: true,
  includeGpu: true,
  includePca: true,
  includeWater: true,
  includeVdgs: true,
  includeArff: false,
  includeFollowMe: false,
  includeGroundHandling: false,
  includeThyDiscount: false,
};

// Helper: Detect THY (Turkish Airlines) flights
export function isThyFlight(flight: FlightRecord): boolean {
  const al = (flight.airline || '').toUpperCase();
  const arr = (flight.arrFlightNo || '').toUpperCase();
  const dep = (flight.depFlightNo || '').toUpperCase();

  return (
    al.includes('THY') ||
    al.includes('TURKISH AIRLINES') ||
    al.includes('TÜRK HAVA YOLLARI') ||
    al.includes('TURKISH') ||
    arr.startsWith('TK') ||
    dep.startsWith('TK')
  );
}

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
  },
  isActualMode: boolean = false
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
      isActualData: false,
      notes: ['❌ İptal Edilen Uçuş (Status: DX) - Kapsam Dışı'],
      subtotalEUR: 0,
      subtotalTRY: 0,
      totalConvertedTRY: 0,
      lineItems: [],
    };
  }

  // 2. Derive Ground Time Hours from exact date-time stamps
  let groundTimeHours = 2.0; // Fallback default if all timestamps missing
  const onBlockMs = parseDateTime(flight.onBlock);
  const offBlockMs = parseDateTime(flight.offBlock);
  const ataMs = parseDateTime(flight.ata);
  const atdMs = parseDateTime(flight.atd);
  const staMs = parseDateTime(flight.sta);
  const stdMs = parseDateTime(flight.std);

  const startMs = onBlockMs || ataMs || staMs;
  const endMs = offBlockMs || atdMs || stdMs;

  if (startMs && endMs && endMs > startMs) {
    const rawHrs = (endMs - startMs) / (1000 * 60 * 60);
    if (rawHrs >= 0.1 && rawHrs <= 168) {
      groundTimeHours = Math.round(rawHrs * 10) / 10;
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

  const cleanNo = (str: string) => (str || '').replace(/^0+/, '').trim().toUpperCase();
  const findUsage = (map?: Record<string, number>): number | undefined => {
    if (!map) return undefined;
    const arrClean = cleanNo(flight.arrFlightNo);
    const depClean = cleanNo(flight.depFlightNo);
    const arrDig = cleanDigits(flight.arrFlightNo);
    const depDig = cleanDigits(flight.depFlightNo);
    const st = cleanNo(flight.stand);

    // Stripped zeros: e.g. A30434 -> A3434
    const arrNorm = arrClean.replace(/([A-Z0-9]{2})0+(\d+)/, '$1$2');
    const depNorm = depClean.replace(/([A-Z0-9]{2})0+(\d+)/, '$1$2');

    if (arrClean && map[arrClean] !== undefined) return map[arrClean];
    if (depClean && map[depClean] !== undefined) return map[depClean];
    if (arrNorm && map[arrNorm] !== undefined) return map[arrNorm];
    if (depNorm && map[depNorm] !== undefined) return map[depNorm];
    if (arrDig && map[arrDig] !== undefined) return map[arrDig];
    if (depDig && map[depDig] !== undefined) return map[depDig];
    if (st && arrClean && map[`${st}_${arrClean}`] !== undefined) return map[`${st}_${arrClean}`];
    if (st && depClean && map[`${st}_${depClean}`] !== undefined) return map[`${st}_${depClean}`];
    if (st && arrDig && map[`${st}_${arrDig}`] !== undefined) return map[`${st}_${arrDig}`];
    if (st && depDig && map[`${st}_${depDig}`] !== undefined) return map[`${st}_${depDig}`];
    return undefined;
  };

  if (isOpenStand) {
    // OPEN STAND RULE: "Açık pozisyonlarda pbb, pca, gpu, vdgs, water hizmeti vermiyoruz."
    notes.push('🅿️ Açık Pozisyon Parkı (Remote Stand) - PBB, GPU, PCA, VDGS ve Su Hizmetleri Uygulanmaz.');
  } else {
    // BRIDGE STAND
    vdgsCountUsed = 1; // Always 1 time on block for all bridge stands

    if (isActualMode) {
      // MODÜL A: Strictly use uploaded actual usage files. NO HABITS FALLBACK!
      const actualPbb = findUsage(customUsageMap?.pbb);
      pbbMinsUsed = actualPbb !== undefined ? actualPbb : 0;

      const actualGpu = findUsage(customUsageMap?.gpu);
      gpuMinsUsed = actualGpu !== undefined ? actualGpu : 0;

      const actualPca = findUsage(customUsageMap?.pca);
      pcaMinsUsed = actualPca !== undefined ? actualPca : 0;

      const actualWater = findUsage(customUsageMap?.water);
      waterCountUsed = actualWater !== undefined ? actualWater : 0;

      usedHabitsFallback = false;

      const waterText = waterCountUsed > 0 ? `${waterCountUsed} ikmal` : 'yok';
      notes.push(
        `Gerçek Veriler Referans Alınmıştır (Modül A): PBB: ${pbbMinsUsed} dk, GPU: ${gpuMinsUsed} dk (${gpuCableCount} Kablo), PCA: ${pcaMinsUsed} dk (${pcaDuctCount} Kanal), Su: ${waterText}, VDGS: 1 adet.`
      );
    } else {
      // MODÜL B: FORECAST MODE - TÜKETİM ALIŞKANLIKLARINA GÖRE (Sefer No -> Havayolu -> Kategori)
      const habit = getAirlineHabit(flight.airline, flight.arrFlightNo || flight.depFlightNo);

      pbbMinsUsed = Math.min(groundTimeMins, habit.pbbMins);
      gpuMinsUsed = Math.min(groundTimeMins, habit.gpuMins);
      pcaMinsUsed = Math.min(groundTimeMins, habit.pcaMins);
      waterCountUsed = habit.waterRefills || 1;
      usedHabitsFallback = true;

      const waterText = waterCountUsed > 0 ? `${waterCountUsed} ikmal` : 'yok';
      notes.push(
        `Tüketim Alışkanlıklarına Göre Tahmin (Modül B): PBB: ${pbbMinsUsed} dk, GPU: ${gpuMinsUsed} dk (${gpuCableCount} Kablo), PCA: ${pcaMinsUsed} dk (${pcaDuctCount} Kanal), Su: ${waterText}, VDGS: 1 adet.`
      );
    }
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

  let lineItems = calcResult.lineItems.filter((item) => item.enabled);
  let subtotalEUR = calcResult.subtotalEUR;
  let subtotalTRY = calcResult.subtotalTRY;
  let totalConvertedTRY = calcResult.totalConvertedTRY;

  // 7. Check THY 10% Discount Option
  if (options.includeThyDiscount && isThyFlight(flight)) {
    subtotalEUR *= 0.90;
    subtotalTRY *= 0.90;
    totalConvertedTRY *= 0.90;

    lineItems = lineItems.map((item) => ({
      ...item,
      total: item.total * 0.90,
      formulaDetails: (item.formulaDetails || item.description || '') + ' (%10 THY İskontosu Uygulandı)',
    }));

    notes.push('🏷️ THY %10 Özel İskonto İndirimi Uygulandı (%10 İndirim).');
  }

  return {
    flight,
    groundTimeHours,
    pbbMinsUsed,
    gpuMinsUsed,
    pcaMinsUsed,
    waterCountUsed,
    vdgsCountUsed,
    usedHabitsFallback,
    isActualData: isActualMode && !usedHabitsFallback,
    notes,
    subtotalEUR,
    subtotalTRY,
    totalConvertedTRY,
    lineItems,
  };
}

// Calculate summary across an entire imported flight list
export function calculateFlightListSummary(
  flights: FlightRecord[],
  selectedAirport: Airport,
  exchangeRateEUR: number,
  options: RevenueOptions = DEFAULT_REVENUE_OPTIONS,
  tariffVersion?: TariffVersion,
  customUsageMap?: {
    gpu?: Record<string, number>;
    pca?: Record<string, number>;
    pbb?: Record<string, number>;
    water?: Record<string, number>;
  },
  isActualMode: boolean = false
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
    const rev = calculateFlightRevenue(flight, selectedAirport, exchangeRateEUR, options, tariffVersion, customUsageMap, isActualMode);
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

  // Calculate Breakdown by Aircraft Type
  const aircraftTypeMap: Record<string, {
    aircraftType: string;
    category: string;
    flightCount: number;
    totalGroundTime: number;
    totalPbbMins: number;
    totalGpuMins: number;
    totalPcaMins: number;
    waterFlightCount: number;
    totalSubtotalEUR: number;
    totalSubtotalTRY: number;
    totalConvertedTRY: number;
  }> = {};

  results.forEach(res => {
    if (res.flight.isCancelled) return;
    const typeKey = res.flight.aircraftType || 'Diğer';
    if (!aircraftTypeMap[typeKey]) {
      aircraftTypeMap[typeKey] = {
        aircraftType: typeKey,
        category: res.flight.aircraftCategory || 'C',
        flightCount: 0,
        totalGroundTime: 0,
        totalPbbMins: 0,
        totalGpuMins: 0,
        totalPcaMins: 0,
        waterFlightCount: 0,
        totalSubtotalEUR: 0,
        totalSubtotalTRY: 0,
        totalConvertedTRY: 0,
      };
    }
    const entry = aircraftTypeMap[typeKey];
    entry.flightCount += 1;
    entry.totalGroundTime += res.groundTimeHours;
    entry.totalPbbMins += res.pbbMinsUsed;
    entry.totalGpuMins += res.gpuMinsUsed;
    entry.totalPcaMins += res.pcaMinsUsed;
    if (res.waterCountUsed > 0) entry.waterFlightCount += 1;
    entry.totalSubtotalEUR += res.subtotalEUR;
    entry.totalSubtotalTRY += res.subtotalTRY;
    entry.totalConvertedTRY += res.totalConvertedTRY;
  });

  const byAircraftType = Object.values(aircraftTypeMap).map(e => ({
    aircraftType: e.aircraftType,
    category: e.category,
    flightCount: e.flightCount,
    avgGroundTimeHours: Math.round((e.totalGroundTime / e.flightCount) * 10) / 10,
    avgPbbMins: Math.round(e.totalPbbMins / e.flightCount),
    avgGpuMins: Math.round(e.totalGpuMins / e.flightCount),
    avgPcaMins: Math.round(e.totalPcaMins / e.flightCount),
    waterFlightCount: e.waterFlightCount,
    totalSubtotalEUR: Math.round(e.totalSubtotalEUR * 100) / 100,
    totalSubtotalTRY: Math.round(e.totalSubtotalTRY * 100) / 100,
    totalConvertedTRY: Math.round(e.totalConvertedTRY * 100) / 100,
  })).sort((a, b) => b.flightCount - a.flightCount);

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
    byAircraftType,
    results,
  };
}

