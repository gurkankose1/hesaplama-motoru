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
  const apId = selectedAirport.id;
  const apTier = selectedAirport.tier;

  // Helper to resolve airport key in tariff tables
  const getAirportKey = () => {
    if (apId.includes('ist')) return 'istanbul';
    if (apId.includes('cukurova')) return 'cukurova';
    if (apId.includes('zafer')) return 'zafer';
    if (apId.includes('esenboga')) return 'esenboga';
    if (apId.includes('antalya')) return 'antalya';
    if (apId.includes('adb')) return 'adb';
    if (apId.includes('bjv')) return 'bjv';
    if (apId.includes('dalaman')) return 'dalaman';
    if (apId.includes('gazipasa')) return 'gazipasa';
    if (apId.includes('zonguldak')) return 'zonguldak';
    return apTier === 'TIER_1' ? 'tier1' : 'tier2';
  };

  const apKey = getAirportKey();

  // -------------------------------------------------------------
  // A) LANDING (Konma)
  // -------------------------------------------------------------
  const landingTable = tariff.landing[apKey] || (apTier === 'TIER_2' ? tariff.landing.tier2 : tariff.landing.tier1);
  let landingUnitPrice = isInt ? landingTable.international : landingTable.domestic;
  let landingCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';

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
    description: `${effectiveMtow} Ton MTOW x ${finalLandingUnitPrice.toFixed(2)} ${landingCurrency}/Ton`,
    formulaDetails: `[Tarife Birim Fiyatı: ${landingUnitPrice.toFixed(2)} ${landingCurrency}] x [${effectiveMtow} Ton] ${maxLandingDiscount > 0 ? `x [1 - %${maxLandingDiscount * 100} İndirim]` : ''} = ${landingTotal.toFixed(2)} ${landingCurrency}`,
    currency: landingCurrency,
    unitPrice: finalLandingUnitPrice,
    quantity: effectiveMtow,
    total: landingTotal,
    enabled: isEnabled('landing'),
  });

  // -------------------------------------------------------------
  // B) PARKING (Konaklama & Yatı Uçağı Zamları - Madde 3.d)
  // -------------------------------------------------------------
  const parkingTable = tariff.parking[apKey] || (apTier === 'TIER_2' ? tariff.parking.tier2 : tariff.parking.tier1);
  let parkingCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let parkingUnitPrice = isInt ? parkingTable.international : parkingTable.domestic;

  let parkingDiscount = 0;
  if (scenario.isTechnicalLanding) parkingDiscount = 0.50;

  const baseParkingRate = parkingUnitPrice * (1 - parkingDiscount);

  // Free first 2 hours
  const chargeableParkingHours = Math.max(0, scenario.parkingHours - tariff.parking.freeHours);
  const parkingDays = Math.ceil(chargeableParkingHours / 24);

  let parkingTotal = 0;
  let parkingNotes = '';
  let parkingFormulaStr = '';

  if (scenario.parkingHours <= tariff.parking.freeHours) {
    parkingFormulaStr = `İlk 2 saat ücretsiz park hakkı (Kalış: ${scenario.parkingHours} saat)`;
  } else {
    if (scenario.isOvernightStay || parkingDays > 1) {
      if (parkingDays > 3) {
        parkingTotal = effectiveMtow * baseParkingRate * parkingDays * 6;
        parkingNotes = `Yatı Uçağı (3+ Gün %500 Zamlı: 6x katsayı)`;
        parkingFormulaStr = `[${effectiveMtow} Ton] x [${baseParkingRate.toFixed(2)} ${parkingCurrency}] x [${parkingDays} Gün] x [6x Katlı Zam] = ${parkingTotal.toFixed(2)} ${parkingCurrency}`;
      } else {
        let totalMultiplier = 0;
        for (let d = 1; d <= parkingDays; d++) {
          if (d === 1) totalMultiplier += 1;
          else if (d === 2) totalMultiplier += 3;
          else if (d === 3) totalMultiplier += 4;
        }
        parkingTotal = effectiveMtow * baseParkingRate * totalMultiplier;
        parkingNotes = `Yatı Uçağı (${parkingDays} Gün Kademeli Zamlı)`;
        parkingFormulaStr = `[${effectiveMtow} Ton] x [${baseParkingRate.toFixed(2)} ${parkingCurrency}] x [Kademeli Katsayı: ${totalMultiplier}x] = ${parkingTotal.toFixed(2)} ${parkingCurrency}`;
      }
    } else {
      parkingTotal = effectiveMtow * baseParkingRate * parkingDays;
      parkingNotes = `${effectiveMtow} Ton x ${parkingDays} Gün (24 sa periyot)`;
      parkingFormulaStr = `[${effectiveMtow} Ton] x [${baseParkingRate.toFixed(2)} ${parkingCurrency}] x [1 Gün] = ${parkingTotal.toFixed(2)} ${parkingCurrency}`;
    }
  }

  lineItems.push({
    id: 'parking',
    category: 'Konma & Konaklama',
    name: 'Konaklama Ücreti (Parking Fee)',
    description: scenario.parkingHours <= 2
      ? `İlk 2 saat ücretsiz (Toplam ${scenario.parkingHours.toFixed(1)} saat konaklama)`
      : `${parkingNotes} x ${baseParkingRate.toFixed(2)} ${parkingCurrency}/Ton`,
    formulaDetails: parkingFormulaStr,
    currency: parkingCurrency,
    unitPrice: baseParkingRate,
    quantity: scenario.parkingHours <= 2 ? 0 : effectiveMtow * parkingDays,
    total: parkingTotal,
    enabled: isEnabled('parking'),
  });

  // -------------------------------------------------------------
  // C) APPROACH (Yaklaşma)
  // -------------------------------------------------------------
  const approachTable = tariff.approach[apKey] || (apTier === 'TIER_2' ? tariff.approach.tier2 : tariff.approach.tier1);
  let approachCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let approachPrice = isInt ? approachTable.international : approachTable.domestic;

  lineItems.push({
    id: 'approach',
    category: 'Konma & Konaklama',
    name: 'Yaklaşma Hizmeti (Approach Control)',
    description: `İniş başına sabit yaklaşma ücreti`,
    formulaDetails: `[İniş Başı Maktu Ücret] = ${approachPrice.toFixed(2)} ${approachCurrency}`,
    currency: approachCurrency,
    unitPrice: approachPrice,
    quantity: 1,
    total: approachPrice,
    enabled: isEnabled('approach'),
  });

  // -------------------------------------------------------------
  // D) LIGHTING (Aydınlatma)
  // -------------------------------------------------------------
  const lightingTable = tariff.lighting[apKey] || (apTier === 'TIER_2' ? tariff.lighting.tier2 : tariff.lighting.tier1);
  let lightingCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  let lightingUnitPrice = isInt ? lightingTable.international : lightingTable.domestic;

  let opsCount = 0;
  if (scenario.nightLanding) opsCount++;
  if (scenario.nightTakeoff) opsCount++;

  const lightingTotal = lightingUnitPrice * opsCount;

  lineItems.push({
    id: 'lighting',
    category: 'Konma & Konaklama',
    name: 'Pist Aydınlatma Ücreti (Runway Lighting)',
    description: `${opsCount} operasyon (Gece İniş/Kalkış)`,
    formulaDetails: `[Birim Fiyat: ${lightingUnitPrice.toFixed(2)} ${lightingCurrency}] x [${opsCount} Gece Operasyonu] = ${lightingTotal.toFixed(2)} ${lightingCurrency}`,
    currency: lightingCurrency,
    unitPrice: lightingUnitPrice,
    quantity: opsCount,
    total: lightingTotal,
    enabled: isEnabled('lighting'),
  });

  // -------------------------------------------------------------
  // E) PASSENGER SERVICE (Yolcu Servis Ücreti)
  // -------------------------------------------------------------
  const paxSvcTable = tariff.passengerService[apKey] || (apTier === 'TIER_2' ? tariff.passengerService.tier2 : tariff.passengerService.tier1);
  let paxSvcCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : (typeof paxSvcTable.domestic === 'string' || paxSvcTable.domestic > 10 ? 'TRY' : 'EUR');
  let paxSvcUnitPrice = isInt ? paxSvcTable.international : paxSvcTable.domestic;

  const paxSvcTotal = scenario.passengerCount * paxSvcUnitPrice;

  lineItems.push({
    id: 'passengerService',
    category: 'Yolcu Hizmetleri',
    name: 'Giden Yolcu Servis Ücreti (Passenger Service Fee)',
    description: `${scenario.passengerCount} giden yolcu x ${paxSvcUnitPrice.toFixed(2)} ${paxSvcCurrency}`,
    formulaDetails: `[Giden Yolcu: ${scenario.passengerCount} Pax] x [Harç: ${paxSvcUnitPrice.toFixed(2)} ${paxSvcCurrency}/Pax] = ${paxSvcTotal.toFixed(2)} ${paxSvcCurrency}`,
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
      description: `${scenario.petcCount} evcil hayvan x %30 yolcu ücreti`,
      formulaDetails: `[${scenario.petcCount} Evcil] x [${paxSvcUnitPrice.toFixed(2)} x %30 = ${petcUnitPrice.toFixed(2)} ${paxSvcCurrency}] = ${(petcUnitPrice * scenario.petcCount).toFixed(2)} ${paxSvcCurrency}`,
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
      description: `${scenario.avihCount} evcil hayvan x %50 yolcu ücreti`,
      formulaDetails: `[${scenario.avihCount} Evcil] x [${paxSvcUnitPrice.toFixed(2)} x %50 = ${avihUnitPrice.toFixed(2)} ${paxSvcCurrency}] = ${(avihUnitPrice * scenario.avihCount).toFixed(2)} ${paxSvcCurrency}`,
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
  const paxSecTable = tariff.passengerSecurity[apKey] || (apTier === 'TIER_2' ? tariff.passengerSecurity.tier2 : tariff.passengerSecurity.tier1);
  let paxSecCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : (paxSecTable.domestic > 10 ? 'TRY' : 'EUR');
  let paxSecUnitPrice = isInt ? paxSecTable.international : paxSecTable.domestic;

  const paxSecTotal = scenario.passengerCount * paxSecUnitPrice;

  lineItems.push({
    id: 'passengerSecurity',
    category: 'Yolcu Hizmetleri',
    name: 'Yolcu Güvenlik Tedbiri Ücreti (Security Fee)',
    description: `${scenario.passengerCount} yolcu x ${paxSecUnitPrice.toFixed(2)} ${paxSecCurrency}`,
    formulaDetails: `[Giden Yolcu: ${scenario.passengerCount} Pax] x [Güvenlik Harcı: ${paxSecUnitPrice.toFixed(2)} ${paxSecCurrency}/Pax] = ${paxSecTotal.toFixed(2)} ${paxSecCurrency}`,
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
    formulaDetails: `[İlk Saat: ${arffUnitPrice.toFixed(2)} ${arffCurrency}] + [İlave Periyotlar] = ${arffTotal.toFixed(2)} ${arffCurrency}`,
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
    formulaDetails: `[Birim Ücret: ${followMePrice.toFixed(2)} ${followMeCurrency}] x [${scenario.followMeCount} Operasyon] = ${(followMePrice * scenario.followMeCount).toFixed(2)} ${followMeCurrency}`,
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
    formulaDetails: `[Saatlik Açılış: ${extUnitPrice.toFixed(2)} ${extCurrency}] x [${scenario.airportExtensionHours} Saat] = ${(extUnitPrice * scenario.airportExtensionHours).toFixed(2)} ${extCurrency}`,
    currency: extCurrency,
    unitPrice: extUnitPrice,
    quantity: scenario.airportExtensionHours,
    total: extUnitPrice * scenario.airportExtensionHours,
    enabled: isEnabled('airportExtension'),
  });

  // -------------------------------------------------------------
  // J) PASSENGER BOARDING BRIDGE & UTILITIES (Airport & MTOW Bracket Lookup)
  // -------------------------------------------------------------
  let bridgeCurrency: 'EUR' | 'TRY' = isInt ? 'EUR' : 'TRY';
  
  // Select Airport Bridge Rates Table (Sayfa 16 Tablo 2.a / 2.b / 2.c)
  let bridgeRatesTable = tariff.bridgeRatesIstanbul;
  let bridgeUtilsTable = tariff.bridgeUtilities.istanbul;

  if (apId.includes('cukurova') || apId.includes('esenboga')) {
    bridgeRatesTable = tariff.bridgeRatesCukurovaGroup;
    bridgeUtilsTable = tariff.bridgeUtilities.cukurovaGroup;
  } else if (apId.includes('antalya') || apId.includes('adb') || apId.includes('bjv') || apId.includes('dalaman')) {
    bridgeRatesTable = tariff.bridgeRatesAntalyaGroup;
    bridgeUtilsTable = tariff.bridgeUtilities.antalyaGroup;
  }

  const bridgeBracket = bridgeRatesTable.find((b: any) => effectiveMtow <= b.maxMtow) || bridgeRatesTable[bridgeRatesTable.length - 1];
  const bridgeRate30m = isInt ? bridgeBracket.intEur30m : bridgeBracket.domTry30m;

  const totalBridgePeriods30m = Math.ceil(scenario.bridgeHours * 2);
  let baseBridgeTotal = 0;

  for (let i = 1; i <= totalBridgePeriods30m; i++) {
    if (scenario.isBridgeOvernightStay) {
      baseBridgeTotal += bridgeRate30m * 0.50;
    } else if (i <= 4) {
      baseBridgeTotal += bridgeRate30m;
    } else {
      baseBridgeTotal += bridgeRate30m * 1.25;
    }
  }

  const bCount = Math.min(3, Math.max(1, scenario.bridgeCount || 1));
  let bridgeMultiMultiplier = 1.0;
  if (bCount === 2) bridgeMultiMultiplier = 1.20;
  else if (bCount >= 3) bridgeMultiMultiplier = 1.40;

  const finalBridgeTotal = baseBridgeTotal * bridgeMultiMultiplier;

  lineItems.push({
    id: 'bridge',
    category: 'Köprü & Ekipman',
    name: `Yolcu Köprüsü (${bCount} Köprü Bağlantılı)`,
    description: `${scenario.bridgeHours} saat (${totalBridgePeriods30m} x 30dk periyot) x ${bCount} Köprü`,
    formulaDetails: `[MTOW ${effectiveMtow}t Kademesi: ${bridgeRate30m.toFixed(2)} ${bridgeCurrency}/30dk] x [${totalBridgePeriods30m} Periyot ${scenario.bridgeHours > 2 ? '(2saat sonrası %25 zamlı)' : ''}] ${bCount > 1 ? `x [${bCount} Köprü: %${(bCount - 1) * 20} İlave]` : ''} = ${finalBridgeTotal.toFixed(2)} ${bridgeCurrency}`,
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
  const powerPricePerMin = isInt ? bridgeUtilsTable.power400Hz.intEurPerMin : bridgeUtilsTable.power400Hz.domTryPerMin;
  const gpuMinutes = scenario.bridge400HzMinutes || Math.round(scenario.parkingHours * 60);
  const gpuCables = Math.min(4, Math.max(1, scenario.gpuCableCount || 1));
  
  let gpuCableMultiplier = 1.0;
  if (gpuCables === 2) gpuCableMultiplier = 1.50;
  else if (gpuCables === 3) gpuCableMultiplier = 2.00;
  else if (gpuCables >= 4) gpuCableMultiplier = 2.50;

  const finalGpuUnitPrice = powerPricePerMin * gpuCableMultiplier;
  const gpuTotal = finalGpuUnitPrice * gpuMinutes;

  lineItems.push({
    id: 'bridge400Hz',
    category: 'Köprü & Ekipman',
    name: `GPU (400 Hz Uçak Elektrik - ${gpuCables} Kablo)`,
    description: `${gpuMinutes} dk x ${finalGpuUnitPrice.toFixed(2)} ${bridgeCurrency}/dk`,
    formulaDetails: `[Birim Tarife: ${powerPricePerMin.toFixed(2)} ${bridgeCurrency}/dk] x [${gpuMinutes} Dakika] x [${gpuCables} Kablo Bağlantısı: ${gpuCableMultiplier}x (${gpuCables > 1 ? `+%${(gpuCableMultiplier - 1) * 100} Zam` : 'Zam Yok'})] = ${gpuTotal.toFixed(2)} ${bridgeCurrency}`,
    currency: bridgeCurrency,
    unitPrice: finalGpuUnitPrice,
    quantity: gpuMinutes,
    total: gpuTotal,
    enabled: isEnabled('bridge400Hz'),
  });

  // PCA Havalandırma (Sayfa 16 Tablo 2.a/b/c: EXACT TRANSPARENT MTOW BRACKET MATH!)
  const pcaBaseUnitPrice = isInt ? bridgeBracket.pcaIntEurMin : bridgeBracket.pcaDomTryMin;
  const pcaMinutes = scenario.bridgePcaMinutes || Math.round(scenario.parkingHours * 60);
  const pcaDucts = Math.min(4, Math.max(1, scenario.pcaDuctCount || 1));

  let pcaDuctMultiplier = 1.0;
  if (pcaDucts === 2) pcaDuctMultiplier = 1.50;
  else if (pcaDucts === 3) pcaDuctMultiplier = 2.00;
  else if (pcaDucts >= 4) pcaDuctMultiplier = 2.50;

  const finalPcaUnitPrice = pcaBaseUnitPrice * pcaDuctMultiplier;
  const pcaTotal = finalPcaUnitPrice * pcaMinutes;

  lineItems.push({
    id: 'bridgePca',
    category: 'Köprü & Ekipman',
    name: `PCA Havalandırma (${pcaDucts} Kanal)`,
    description: `${pcaMinutes} dk x ${finalPcaUnitPrice.toFixed(2)} ${bridgeCurrency}/dk`,
    formulaDetails: `[${effectiveMtow} Ton MTOW Kademesi Birim Tarife: ${pcaBaseUnitPrice.toFixed(2)} ${bridgeCurrency}/dk] x [${pcaMinutes} Dk] x [${pcaDucts} Hava Kanalı: ${pcaDuctMultiplier}x (${pcaDucts > 1 ? `+%${(pcaDuctMultiplier - 1) * 100} Zam` : 'Zam Yok'})] = ${pcaTotal.toFixed(2)} ${bridgeCurrency}`,
    currency: bridgeCurrency,
    unitPrice: finalPcaUnitPrice,
    quantity: pcaMinutes,
    total: pcaTotal,
    enabled: isEnabled('bridgePca'),
  });

  // Su Hizmeti (Refill Count Selector: 1, 2, 3, 4)
  const waterPrice = isInt
    ? (effectiveMtow > 150 ? bridgeUtilsTable.waterSupply.highIntEur : bridgeUtilsTable.waterSupply.lowIntEur)
    : (effectiveMtow > 150 ? bridgeUtilsTable.waterSupply.highDomTry : bridgeUtilsTable.waterSupply.lowDomTry);

  const waterCount = Math.max(1, scenario.waterServiceCount || 1);
  const waterTotal = waterPrice * waterCount;

  lineItems.push({
    id: 'bridgeWater',
    category: 'Köprü & Ekipman',
    name: 'Su Hizmeti (Su İkmal / Dolum)',
    description: `${waterCount} adet su ikmal dolum servisi (${effectiveMtow > 150 ? '>150t' : '0-150t'} kademesi)`,
    formulaDetails: `[Birim Dolum Bedeli: ${waterPrice.toFixed(2)} ${bridgeCurrency}] x [${waterCount} İkmal Servisi] = ${waterTotal.toFixed(2)} ${bridgeCurrency}`,
    currency: bridgeCurrency,
    unitPrice: waterPrice,
    quantity: waterCount,
    total: waterTotal,
    enabled: isEnabled('bridgeWater'),
  });

  // VDGS
  const vdgsPrice = isInt ? bridgeUtilsTable.vdgs.intEurPerUse : bridgeUtilsTable.vdgs.domTryPerUse;
  lineItems.push({
    id: 'bridgeVdgs',
    category: 'Köprü & Ekipman',
    name: 'VDGS Otomatik Park Ettirme Sistemi',
    description: `Görsel park rehberlik sistemi`,
    formulaDetails: `[Maktu İniş Başı Ücret] = ${vdgsPrice.toFixed(2)} ${bridgeCurrency}`,
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
    formulaDetails: `[${scenario.seats} Koltuk Kademesi Maktu Harç] = ${ghRampPrice.toFixed(2)} EUR`,
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
    formulaDetails: `[Maktu Harç] = ${ghPaxSvcPrice.toFixed(2)} EUR`,
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
    formulaDetails: `[Maktu Harç] = ${ghLoadCtrlPrice.toFixed(2)} EUR`,
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
