import type { Airport, FeeCalculationResult, FleetSummaryResult, FlightScenario, ServiceLineItem, TariffVersion } from '../types/tariff';
import { DEFAULT_TARIFF_2026 } from './defaultTariff2026';

export function calculateScenarioFees(
  scenario: FlightScenario,
  selectedAirport: Airport,
  exchangeRateEUR: number, // e.g. 40.50 TL / EUR
  tariffVersion: TariffVersion = DEFAULT_TARIFF_2026
): FeeCalculationResult {
  const lineItems: ServiceLineItem[] = [];
  const tariff = tariffVersion.data;

  // Helper for checking if service is toggled ON (Default is FALSE / Unchecked per user request!)
  const isEnabled = (serviceId: string): boolean => {
    return scenario.enabledServices[serviceId] === true;
  };

  // 1. Effective MTOW calculation (Round up to full integer, min 20t for aircraft >2t)
  let effectiveMtow = Math.ceil(scenario.mtow);
  if (scenario.mtow > 2 && effectiveMtow < 20) {
    effectiveMtow = 20;
  }

  const isInt = scenario.flightCategory === 'INTERNATIONAL';
  const tier = selectedAirport.tier;

  // -------------------------------------------------------------
  // A) LANDING (Konma)
  // -------------------------------------------------------------
  let landingUnitPrice = 0;
  let landingCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';

  if (isInt) {
    landingUnitPrice = tier === 'TIER_2' ? tariff.landing.international.tier2 : tariff.landing.international.tier1;
  } else {
    landingUnitPrice = tier === 'TIER_2' ? tariff.landing.domestic.tier2 : tariff.landing.domestic.tier1;
  }

  // Calculate landing discounts (max single discount applied per DHMİ rules)
  let maxLandingDiscount = 0;
  if (scenario.isTechnicalLanding) maxLandingDiscount = Math.max(maxLandingDiscount, 0.50);
  if (scenario.isSeasonalDiscountApplicable) maxLandingDiscount = Math.max(maxLandingDiscount, 0.50);

  const finalLandingUnitPrice = landingUnitPrice * (1 - maxLandingDiscount);
  const landingTotal = effectiveMtow * finalLandingUnitPrice;

  lineItems.push({
    id: 'landing',
    category: 'Konma & Konaklama',
    name: 'Konma Ücreti (Landing Fee)',
    description: `${effectiveMtow} Ton MTOW x ${finalLandingUnitPrice.toFixed(2)} ${landingCurrency}/Ton (${maxLandingDiscount > 0 ? `%${maxLandingDiscount * 100} İndirimli` : 'Standart'})`,
    currency: landingCurrency,
    unitPrice: finalLandingUnitPrice,
    quantity: effectiveMtow,
    total: landingTotal,
    enabled: isEnabled('landing'),
  });

  // -------------------------------------------------------------
  // B) PARKING (Konaklama & Yatı Uçağı Zamları - Madde 3.d)
  // -------------------------------------------------------------
  let parkingCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let parkingUnitPrice = 0;
  if (isInt) {
    parkingUnitPrice = tier === 'TIER_2' ? tariff.parking.international.tier2 : tariff.parking.international.tier1;
  } else {
    parkingUnitPrice = tier === 'TIER_2' ? tariff.parking.domestic.tier2 : tariff.parking.domestic.tier1;
  }

  let parkingDiscount = 0;
  if (scenario.isTechnicalLanding) parkingDiscount = 0.50;

  const baseParkingRate = parkingUnitPrice * (1 - parkingDiscount);

  // Free first 2 hours
  const chargeableParkingHours = Math.max(0, scenario.parkingHours - tariff.parking.freeHours);
  const parkingDays = Math.ceil(chargeableParkingHours / 24);

  let parkingTotal = 0;
  let parkingNotes = '';

  if (scenario.parkingHours > tariff.parking.freeHours) {
    if (scenario.isOvernightStay || parkingDays > 1) {
      // Yatı uçağı zam kuralları (Sayfa 5 Madde 3.d)
      if (parkingDays > 3) {
        // 3 gün üzeri konaklamada sürenin tamamına %500 zam (6x)
        parkingTotal = effectiveMtow * baseParkingRate * parkingDays * 6;
        parkingNotes = `Yatı Uçağı (3+ Gün %500 Zamlı: 6x katsayı)`;
      } else {
        // 1. Gün: 1x, 2. Gün: 3x (%200 zam), 3. Gün: 4x (%300 zam)
        let totalMultiplier = 0;
        for (let d = 1; d <= parkingDays; d++) {
          if (d === 1) totalMultiplier += 1;
          else if (d === 2) totalMultiplier += 3; // %200 zam
          else if (d === 3) totalMultiplier += 4; // %300 zam
        }
        parkingTotal = effectiveMtow * baseParkingRate * totalMultiplier;
        parkingNotes = `Yatı Uçağı (${parkingDays} Gün Kademeli Zamlı)`;
      }
    } else {
      parkingTotal = effectiveMtow * baseParkingRate * parkingDays;
      parkingNotes = `${effectiveMtow} Ton x ${parkingDays} Gün (24 sa periyot)`;
    }
  }

  lineItems.push({
    id: 'parking',
    category: 'Konma & Konaklama',
    name: 'Konaklama Ücreti (Parking Fee)',
    description: scenario.parkingHours <= 2
      ? `İlk 2 saat ücretsiz (Toplam ${scenario.parkingHours.toFixed(1)} saat konaklama)`
      : `${parkingNotes} x ${baseParkingRate.toFixed(2)} ${parkingCurrency}/Ton`,
    currency: parkingCurrency,
    unitPrice: baseParkingRate,
    quantity: scenario.parkingHours <= 2 ? 0 : effectiveMtow * parkingDays,
    total: parkingTotal,
    enabled: isEnabled('parking'),
  });

  // -------------------------------------------------------------
  // C) APPROACH (Yaklaşma)
  // -------------------------------------------------------------
  let approachCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let approachPrice = 0;
  if (isInt) {
    approachPrice = tier === 'TIER_2' ? tariff.approach.international.tier2 : tariff.approach.international.tier1;
  } else {
    approachPrice = tier === 'TIER_2' ? tariff.approach.domestic.tier2 : tariff.approach.domestic.tier1;
  }

  lineItems.push({
    id: 'approach',
    category: 'Konma & Konaklama',
    name: 'Yaklaşma Hizmeti (Approach Control)',
    description: `İniş başına sabit yaklaşma ücreti`,
    currency: approachCurrency,
    unitPrice: approachPrice,
    quantity: 1,
    total: approachPrice,
    enabled: isEnabled('approach'),
  });

  // -------------------------------------------------------------
  // D) LIGHTING (Aydınlatma)
  // -------------------------------------------------------------
  let lightingCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let lightingUnitPrice = 0;
  if (isInt) {
    lightingUnitPrice = tier === 'TIER_2' ? tariff.lighting.international.tier2 : tariff.lighting.international.tier1;
  } else {
    lightingUnitPrice = tier === 'TIER_2' ? tariff.lighting.domestic.tier2 : tariff.lighting.domestic.tier1;
  }

  let opsCount = 0;
  if (scenario.nightLanding) opsCount++;
  if (scenario.nightTakeoff) opsCount++;

  const lightingTotal = lightingUnitPrice * opsCount;

  lineItems.push({
    id: 'lighting',
    category: 'Konma & Konaklama',
    name: 'Pist Aydınlatma Ücreti (Runway Lighting)',
    description: `${opsCount} operasyon (Gece İniş/Kalkış)`,
    currency: lightingCurrency,
    unitPrice: lightingUnitPrice,
    quantity: opsCount,
    total: lightingTotal,
    enabled: isEnabled('lighting'),
  });

  // -------------------------------------------------------------
  // E) PASSENGER SERVICE (Yolcu Servis Ücreti)
  // -------------------------------------------------------------
  let paxSvcCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let paxSvcUnitPrice = 0;

  if (tier === 'IST_PPP') {
    paxSvcUnitPrice = isInt ? tariff.passengerService.istPpp.international : tariff.passengerService.istPpp.domestic;
  } else if (tier === 'TIER_1') {
    paxSvcUnitPrice = isInt ? tariff.passengerService.tier1.international : tariff.passengerService.tier1.domestic;
  } else {
    paxSvcUnitPrice = isInt ? tariff.passengerService.tier2.international : tariff.passengerService.tier2.domestic;
  }

  const paxSvcTotal = scenario.passengerCount * paxSvcUnitPrice;

  lineItems.push({
    id: 'passengerService',
    category: 'Yolcu Hizmetleri',
    name: 'Giden Yolcu Servis Ücreti (Passenger Service Fee)',
    description: `${scenario.passengerCount} giden yolcu x ${paxSvcUnitPrice.toFixed(2)} ${paxSvcCurrency}`,
    currency: paxSvcCurrency,
    unitPrice: paxSvcUnitPrice,
    quantity: scenario.passengerCount,
    total: paxSvcTotal,
    enabled: isEnabled('passengerService'),
  });

  // PetC & Avih Evcil Hayvan Ekstra Yolcu Ücretleri
  if (scenario.petcCount > 0) {
    const petcUnitPrice = paxSvcUnitPrice * 0.30;
    lineItems.push({
      id: 'petcPassenger',
      category: 'Yolcu Hizmetleri',
      name: 'Kabin Evcil Hayvan Servis Ücreti (PetC)',
      description: `${scenario.petcCount} evcil hayvan x %30 yolcu ücreti (${petcUnitPrice.toFixed(2)} ${paxSvcCurrency})`,
      currency: paxSvcCurrency,
      unitPrice: petcUnitPrice,
      quantity: scenario.petcCount,
      total: petcUnitPrice * scenario.petcCount,
      enabled: isEnabled('petcPassenger'),
    });
  }

  if (scenario.avihCount > 0) {
    const avihUnitPrice = paxSvcUnitPrice * 0.50;
    lineItems.push({
      id: 'avihPassenger',
      category: 'Yolcu Hizmetleri',
      name: 'Uçak Altı Evcil Hayvan Servis Ücreti (Avih)',
      description: `${scenario.avihCount} evcil hayvan x %50 yolcu ücreti (${avihUnitPrice.toFixed(2)} ${paxSvcCurrency})`,
      currency: paxSvcCurrency,
      unitPrice: avihUnitPrice,
      quantity: scenario.avihCount,
      total: avihUnitPrice * scenario.avihCount,
      enabled: isEnabled('avihPassenger'),
    });
  }

  // -------------------------------------------------------------
  // F) PASSENGER SECURITY (Yolcu Güvenlik Ücreti)
  // -------------------------------------------------------------
  let paxSecCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let paxSecUnitPrice = 0;

  if (tier === 'IST_PPP' || tier === 'TIER_1') {
    paxSecUnitPrice = isInt ? tariff.passengerSecurity.istPpp.international : tariff.passengerSecurity.istPpp.domestic;
  } else {
    paxSecUnitPrice = isInt ? tariff.passengerSecurity.tier2.international : tariff.passengerSecurity.tier2.domestic;
  }

  const paxSecTotal = scenario.passengerCount * paxSecUnitPrice;

  lineItems.push({
    id: 'passengerSecurity',
    category: 'Yolcu Hizmetleri',
    name: 'Yolcu Güvenlik Tedbiri Ücreti (Security Fee)',
    description: `${scenario.passengerCount} yolcu x ${paxSecUnitPrice.toFixed(2)} ${paxSecCurrency}`,
    currency: paxSecCurrency,
    unitPrice: paxSecUnitPrice,
    quantity: scenario.passengerCount,
    total: paxSecTotal,
    enabled: isEnabled('passengerSecurity'),
  });

  // -------------------------------------------------------------
  // G) ARFF FIRE SAFETY (Emniyet Tedbiri)
  // -------------------------------------------------------------
  let arffCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let arffUnitPrice = isInt ? tariff.arffSafety.international : tariff.arffSafety.domestic;
  
  let arffTotal = 0;
  if (scenario.arffHours > 0) {
    if (scenario.arffHours <= 1) {
      arffTotal = arffUnitPrice;
    } else {
      const extra30mPeriods = Math.ceil((scenario.arffHours - 1) * 2);
      arffTotal = arffUnitPrice + extra30mPeriods * (arffUnitPrice / 2);
    }
  }

  lineItems.push({
    id: 'arffSafety',
    category: 'Operasyonel & Emniyet',
    name: 'Emniyet Tedbiri / İtfaiye Standby (ARFF)',
    description: `${scenario.arffHours} saat yangın söndürme nöbeti`,
    currency: arffCurrency,
    unitPrice: arffUnitPrice,
    quantity: scenario.arffHours,
    total: arffTotal,
    enabled: isEnabled('arffSafety'),
  });

  // -------------------------------------------------------------
  // H) FOLLOW-ME (Uçak Yönlendirme)
  // -------------------------------------------------------------
  let followMeCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let followMePrice = isInt ? tariff.followMe.international : tariff.followMe.domestic;

  lineItems.push({
    id: 'followMe',
    category: 'Operasyonel & Emniyet',
    name: 'Follow-Me / Yönlendirme Hizmeti',
    description: `${scenario.followMeCount} adet yönlendirme operasyonu`,
    currency: followMeCurrency,
    unitPrice: followMePrice,
    quantity: scenario.followMeCount,
    total: followMePrice * scenario.followMeCount,
    enabled: isEnabled('followMe'),
  });

  // -------------------------------------------------------------
  // I) AIRPORT WORKING HOURS EXTENSION (Çalışma Saati Uzatma)
  // -------------------------------------------------------------
  let extCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let extUnitPrice = isInt ? tariff.airportExtension.international : tariff.airportExtension.domestic;

  lineItems.push({
    id: 'airportExtension',
    category: 'Operasyonel & Emniyet',
    name: 'Havalimanı Çalışma Saati Uzatılması',
    description: `${scenario.airportExtensionHours} saat havalimanı fazla mesai/açılış`,
    currency: extCurrency,
    unitPrice: extUnitPrice,
    quantity: scenario.airportExtensionHours,
    total: extUnitPrice * scenario.airportExtensionHours,
    enabled: isEnabled('airportExtension'),
  });

  // -------------------------------------------------------------
  // J) PASSENGER BOARDING BRIDGE & UTILITIES (MTOW Bracket Lookup)
  // -------------------------------------------------------------
  let bridgeCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  const bridgeBracket = tariff.bridgeRates.find((b: any) => effectiveMtow <= b.maxMtow) || tariff.bridgeRates[tariff.bridgeRates.length - 1];
  
  // Bridge Rate (per 30m)
  const bridgeRate30m = isInt ? bridgeBracket.intEur30m : bridgeBracket.domTry30m;

  const totalBridgePeriods30m = Math.ceil(scenario.bridgeHours * 2);
  let baseBridgeTotal = 0;

  for (let i = 1; i <= totalBridgePeriods30m; i++) {
    if (scenario.isBridgeOvernightStay) {
      // Körükte zorunlu yatıya kalma: %50 indirimli (Sayfa 17 Madde 3.j)
      baseBridgeTotal += bridgeRate30m * 0.50;
    } else if (i <= 4) {
      baseBridgeTotal += bridgeRate30m; // İlk 2 saat standart
    } else {
      baseBridgeTotal += bridgeRate30m * 1.25; // 2 saat sonrası %25 zamlı
    }
  }

  // Madde 3.k: 2. ve 3. Köprü İlave Çarpanı (%20 ikinci köprü, %20 üçüncü köprü)
  const bCount = Math.min(3, Math.max(1, scenario.bridgeCount || 1));
  let bridgeMultiMultiplier = 1.0;
  if (bCount === 2) bridgeMultiMultiplier = 1.20; // +%20
  else if (bCount >= 3) bridgeMultiMultiplier = 1.40; // +%40

  const finalBridgeTotal = baseBridgeTotal * bridgeMultiMultiplier;

  lineItems.push({
    id: 'bridge',
    category: 'Köprü & Ekipman',
    name: `Yolcu Köprüsü (${bCount} Köprü Bağlantılı)`,
    description: `${scenario.bridgeHours} saat (${totalBridgePeriods30m} x 30dk periyot) x ${bCount} Köprü (MTOW Sayfa 16 Kademeli: ${bridgeRate30m} ${bridgeCurrency}/30dk)`,
    currency: bridgeCurrency,
    unitPrice: bridgeRate30m,
    quantity: totalBridgePeriods30m,
    total: finalBridgeTotal,
    enabled: isEnabled('bridge'),
  });

  // -------------------------------------------------------------
  // K) GPU (400Hz) & PCA (MTOW-bracketed PCA rates + Cable/Duct Surcharges)
  // -------------------------------------------------------------

  // GPU (400Hz Elektrik) + Cable Count Surcharge (Madde 3.f: 1=1x, 2=1.5x, 3=2x, 4=2.5x)
  const powerPricePerMin = isInt ? tariff.bridgeUtilities.power400Hz.intEurPerMin : tariff.bridgeUtilities.power400Hz.domTryPerMin;
  const gpuMinutes = scenario.bridge400HzMinutes || Math.round(scenario.parkingHours * 60);
  const gpuCables = Math.min(4, Math.max(1, scenario.gpuCableCount || 1));
  
  let gpuCableMultiplier = 1.0;
  if (gpuCables === 2) gpuCableMultiplier = 1.50; // %50 zam
  else if (gpuCables === 3) gpuCableMultiplier = 2.00; // %100 zam
  else if (gpuCables >= 4) gpuCableMultiplier = 2.50; // %150 zam

  const gpuTotal = powerPricePerMin * gpuMinutes * gpuCableMultiplier;

  lineItems.push({
    id: 'bridge400Hz',
    category: 'Köprü & Ekipman',
    name: `GPU (400 Hz Uçak Elektrik - ${gpuCables} Kablo)`,
    description: `${gpuMinutes} dk x ${powerPricePerMin} ${bridgeCurrency}/dk (Madde 3.f: ${gpuCables} Kablo Bağlantılı ${gpuCables > 1 ? `+%${(gpuCableMultiplier - 1) * 100} Zamlı` : ''})`,
    currency: bridgeCurrency,
    unitPrice: powerPricePerMin * gpuCableMultiplier,
    quantity: gpuMinutes,
    total: gpuTotal,
    enabled: isEnabled('bridge400Hz'),
  });

  // PCA Havalandırma (Sayfa 16 Tablo 2.a/b/c: Exact MTOW Bracket Unit Rate!)
  // MTOW <= 106t -> €0.81 int / 0.51 dom
  // MTOW 107-152t -> €1.21 int / 0.66 dom
  // MTOW 153-212t -> €1.48 int / 0.83 dom
  // MTOW >= 213t  -> €1.75 int / 1.01 dom
  const pcaBaseUnitPrice = isInt
    ? (bridgeBracket.pcaIntEurMin || 1.21)
    : (bridgeBracket.pcaDomTryMin || 0.66);

  const pcaMinutes = scenario.bridgePcaMinutes || Math.round(scenario.parkingHours * 60);
  const pcaDucts = Math.min(4, Math.max(1, scenario.pcaDuctCount || 1));

  let pcaDuctMultiplier = 1.0;
  if (pcaDucts === 2) pcaDuctMultiplier = 1.50; // %50 zam
  else if (pcaDucts === 3) pcaDuctMultiplier = 2.00; // %100 zam
  else if (pcaDucts >= 4) pcaDuctMultiplier = 2.50; // %150 zam

  const finalPcaUnitPrice = pcaBaseUnitPrice * pcaDuctMultiplier;
  const pcaTotal = finalPcaUnitPrice * pcaMinutes;

  lineItems.push({
    id: 'bridgePca',
    category: 'Köprü & Ekipman',
    name: `PCA Havalandırma (${pcaDucts} Kanal)`,
    description: `${pcaMinutes} dk x ${pcaBaseUnitPrice.toFixed(2)} ${bridgeCurrency}/dk (${effectiveMtow} Ton MTOW Kademeli Sayfa 16, ${pcaDucts} Kanal ${pcaDucts > 1 ? `+%${(pcaDuctMultiplier - 1) * 100} Zamlı` : ''})`,
    currency: bridgeCurrency,
    unitPrice: finalPcaUnitPrice,
    quantity: pcaMinutes,
    total: pcaTotal,
    enabled: isEnabled('bridgePca'),
  });

  // Su Hizmeti (Refill Count Selector: 1, 2, 3, 4)
  const waterPrice = isInt
    ? (effectiveMtow > 150 ? tariff.bridgeUtilities.waterSupply.highIntEur : tariff.bridgeUtilities.waterSupply.lowIntEur)
    : (effectiveMtow > 150 ? tariff.bridgeUtilities.waterSupply.highDomTry : tariff.bridgeUtilities.waterSupply.lowDomTry);

  const waterCount = Math.max(1, scenario.waterServiceCount || 1);

  lineItems.push({
    id: 'bridgeWater',
    category: 'Köprü & Ekipman',
    name: 'Su Hizmeti (Su İkmal / Dolum)',
    description: `${waterCount} adet su ikmal dolum servisi (${effectiveMtow > 150 ? '>150t' : '0-150t'} kademesi)`,
    currency: bridgeCurrency,
    unitPrice: waterPrice,
    quantity: waterCount,
    total: waterPrice * waterCount,
    enabled: isEnabled('bridgeWater'),
  });

  // VDGS
  const vdgsPrice = isInt ? tariff.bridgeUtilities.vdgs.intEurPerUse : tariff.bridgeUtilities.vdgs.domTryPerUse;
  lineItems.push({
    id: 'bridgeVdgs',
    category: 'Köprü & Ekipman',
    name: 'VDGS Otomatik Park Ettirme Sistemi',
    description: `Görsel park rehberlik sistemi`,
    currency: bridgeCurrency,
    unitPrice: vdgsPrice,
    quantity: 1,
    total: vdgsPrice,
    enabled: isEnabled('bridgeVdgs'),
  });

  // -------------------------------------------------------------
  // L) GROUND HANDLING (Yer Hizmetleri DHMİ Payı)
  // -------------------------------------------------------------
  const ghBracket = tariff.groundHandling.passenger.find((g: any) => scenario.seats <= g.maxSeats) || tariff.groundHandling.passenger[tariff.groundHandling.passenger.length - 1];
  const ghRampPrice = ghBracket.ramp;
  const ghPaxSvcPrice = ghBracket.paxSvc;
  const ghLoadCtrlPrice = ghBracket.loadCtrl;

  lineItems.push({
    id: 'ghRamp',
    category: 'Yer Hizmetleri',
    name: 'Yer Hizmetleri - Ramp Hizmeti (DHMI Payı)',
    description: `${scenario.seats} koltuk kademesi standart ramp harcı`,
    currency: 'EUR',
    unitPrice: ghRampPrice,
    quantity: 1,
    total: ghRampPrice,
    enabled: isEnabled('ghRamp'),
  });

  lineItems.push({
    id: 'ghPaxSvc',
    category: 'Yer Hizmetleri',
    name: 'Yer Hizmetleri - Yolcu Hizmeti (DHMI Payı)',
    description: `Kontuar ve yolcu karşılama yetki harcı`,
    currency: 'EUR',
    unitPrice: ghPaxSvcPrice,
    quantity: 1,
    total: ghPaxSvcPrice,
    enabled: isEnabled('ghPaxSvc'),
  });

  lineItems.push({
    id: 'ghLoadCtrl',
    category: 'Yer Hizmetleri',
    name: 'Yer Hizmetleri - Yük Kontrol & Haberleşme',
    description: `Load sheet & operasyon yetki harcı`,
    currency: 'EUR',
    unitPrice: ghLoadCtrlPrice,
    quantity: 1,
    total: ghLoadCtrlPrice,
    enabled: isEnabled('ghLoadCtrl'),
  });

  // Calculate subtotals for single aircraft
  let perAircraftEUR = 0;
  let perAircraftTRY = 0;

  for (const item of lineItems) {
    if (item.enabled) {
      if (item.currency === 'EUR') {
        perAircraftEUR += item.total;
      } else {
        perAircraftTRY += item.total;
      }
    }
  }

  const perAircraftConvertedTRY = perAircraftTRY + (perAircraftEUR * exchangeRateEUR);

  // Multiply by scenario aircraft quantity (e.g. 5x A320)
  const qty = Math.max(1, scenario.quantity);
  const subtotalEUR = perAircraftEUR * qty;
  const subtotalTRY = perAircraftTRY * qty;
  const totalConvertedTRY = perAircraftConvertedTRY * qty;

  return {
    scenarioId: scenario.id,
    quantity: qty,
    lineItems,
    subtotalEUR,
    subtotalTRY,
    totalConvertedTRY,
    perAircraftEUR,
    perAircraftTRY,
    perAircraftConvertedTRY,
  };
}

export function calculateFleetSummary(
  scenarios: FlightScenario[],
  selectedAirport: Airport,
  exchangeRateEUR: number,
  tariffVersion: TariffVersion = DEFAULT_TARIFF_2026
): FleetSummaryResult {
  const resultsByScenario = scenarios.map((s) => calculateScenarioFees(s, selectedAirport, exchangeRateEUR, tariffVersion));

  let totalFlights = scenarios.length;
  let totalAircraftCount = 0;
  let totalPassengers = 0;
  let totalSubtotalEUR = 0;
  let totalSubtotalTRY = 0;
  let totalConvertedTRY = 0;

  const categoryTotalsMap: Record<string, { eur: number; tryVal: number }> = {};

  resultsByScenario.forEach((res, index) => {
    const sc = scenarios[index];
    const qty = sc.quantity;

    totalAircraftCount += qty;
    totalPassengers += sc.passengerCount * qty;
    totalSubtotalEUR += res.subtotalEUR;
    totalSubtotalTRY += res.subtotalTRY;
    totalConvertedTRY += res.totalConvertedTRY;

    res.lineItems.forEach((item) => {
      if (item.enabled) {
        if (!categoryTotalsMap[item.category]) {
          categoryTotalsMap[item.category] = { eur: 0, tryVal: 0 };
        }
        if (item.currency === 'EUR') {
          categoryTotalsMap[item.category].eur += item.total * qty;
        } else {
          categoryTotalsMap[item.category].tryVal += item.total * qty;
        }
      }
    });
  });

  const byCategory = Object.keys(categoryTotalsMap).map((cat) => {
    const eur = categoryTotalsMap[cat].eur;
    const tryVal = categoryTotalsMap[cat].tryVal;
    return {
      category: cat,
      amountEUR: eur,
      amountTRY: tryVal,
      convertedTRY: tryVal + (eur * exchangeRateEUR),
    };
  });

  return {
    totalFlights,
    totalAircraftCount,
    totalPassengers,
    totalSubtotalEUR,
    totalSubtotalTRY,
    totalConvertedTRY,
    exchangeRateEUR,
    byCategory,
    byAirportName: selectedAirport.name,
    resultsByScenario,
  };
}
