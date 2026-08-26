import type { Airport, TariffVersion } from '../types/tariff';

export const AIRPORTS: Airport[] = [
  { id: 'ist-iga', name: 'İstanbul Havalimanı (IST / LTFM - İGA KÖİ 2026)', code: 'IST', tier: 'IST_PPP', city: 'İstanbul', isPpp: true },
  { id: 'cukurova-cov', name: 'Çukurova Havalimanı (COV - KÖİ 2026)', code: 'COV', tier: 'TIER_1', city: 'Mersin/Adana', isPpp: true },
  { id: 'antalya-ayt', name: 'Antalya Havalimanı (AYT - TAV/FRAPORT KÖİ)', code: 'AYT', tier: 'TIER_1', city: 'Antalya', isPpp: true },
  { id: 'esenboga-esb', name: 'Ankara Esenboğa Havalimanı (ESB - TAV KÖİ)', code: 'ESB', tier: 'TIER_1', city: 'Ankara', isPpp: true },
  { id: 'izmir-adb', name: 'İzmir Adnan Menderes Havalimanı (ADB - TAV KÖİ)', code: 'ADB', tier: 'TIER_1', city: 'İzmir', isPpp: true },
  { id: 'bodrum-bjv', name: 'Muğla Milas-Bodrum Havalimanı (BJV - TAV KÖİ)', code: 'BJV', tier: 'TIER_1', city: 'Muğla', isPpp: true },
  { id: 'dalaman-dlm', name: 'Muğla Dalaman Havalimanı (DLM - YDA KÖİ)', code: 'DLM', tier: 'TIER_1', city: 'Muğla', isPpp: true },
  { id: 'zafer-zfr', name: 'Zafer Havalimanı (ZFR - KÖİ 2026)', code: 'ZFR', tier: 'TIER_2', city: 'Kütahya/Afyon', isPpp: true },
  { id: 'other-dhmi', name: 'Diğer Havalimanları (Gazipaşa, Zonguldak, Aydın vb.)', code: 'OTHER', tier: 'TIER_2', city: 'Diğer', isPpp: false },
];

export const DEFAULT_TARIFF_2026: TariffVersion = {
  id: 'dhmi-koi-2026-rev01',
  name: '2026 KÖİ Projeleri Havalimanı Ücret Tarifesi (Resmi Rev.01)',
  effectiveDate: '2026-01-01',
  revision: 'KÖİ 2026 Rev.01',
  data: {
    landing: {
      international: {
        tier1: 13.28, // EUR per Ton (İGA IST KÖİ 2026 Sayfa 4)
        tier2: 6.34,  // EUR per Ton
      },
      domestic: {
        tier1: 43.33, // TRY per Ton (Sayfa 7)
        tier2: 20.70, // TRY per Ton
      }
    },
    parking: {
      freeHours: 2,
      international: {
        tier1: 4.08, // EUR per Ton per 24h (Sayfa 4)
        tier2: 1.56,
      },
      domestic: {
        tier1: 13.02, // TRY per Ton per 24h (Sayfa 7)
        tier2: 8.22,
      }
    },
    approach: {
      international: {
        tier1: 74.40, // EUR (Sayfa 4)
        tier2: 57.24,
      },
      domestic: {
        tier1: 244.00, // TRY (Sayfa 7)
        tier2: 188.00,
      }
    },
    lighting: {
      international: {
        tier1: 81.84, // EUR per ops (Sayfa 4)
        tier2: 62.95,
      },
      domestic: {
        tier1: 527.75, // TRY (Sayfa 7)
        tier2: 462.19,
      }
    },
    passengerService: {
      istPpp: {
        international: 20.00, // EUR per departing passenger (İGA KÖİ Sayfa 10)
        domestic: 3.00,       // EUR per departing passenger (Sayfa 10 Tablo 2.b)
      },
      tier1: {
        international: 15.00, // EUR
        domestic: 68.60,      // TRY
      },
      tier2: {
        international: 10.00, // EUR
        domestic: 54.90,      // TRY
      }
    },
    passengerSecurity: {
      istPpp: {
        international: 3.04, // EUR per pax (Sayfa 10)
        domestic: 11.80,     // TRY per pax
      },
      tier1: {
        international: 3.00, // EUR per pax
        domestic: 11.80,
      },
      tier2: {
        international: 2.00, // EUR
        domestic: 4.10,
      }
    },
    arffSafety: {
      international: 273.29, // EUR per hour (Sayfa 13)
      domestic: 5866.00,     // TRY per hour
    },
    followMe: {
      international: 112.35, // EUR per operation (Sayfa 14)
      domestic: 2709.00,     // TRY per operation
    },
    airportExtension: {
      international: 1029.50, // EUR per hour (Sayfa 15)
      domestic: 10012.00,     // TRY per hour
    },
    // Exact İGA İstanbul Yolcu Köprüsü & Ekipman Kademeleri (Sayfa 16 Tablo 2.a)
    bridgeRates: [
      { maxMtow: 50,  intEur30m: 61.84,  domTry30m: 31.14, pcaIntEurMin: 0.81, pcaDomTryMin: 0.51 },
      { maxMtow: 75,  intEur30m: 80.45,  domTry30m: 41.85, pcaIntEurMin: 0.81, pcaDomTryMin: 0.51 },
      { maxMtow: 106, intEur30m: 104.17, domTry30m: 52.08, pcaIntEurMin: 0.81, pcaDomTryMin: 0.51 },
      { maxMtow: 152, intEur30m: 134.87, domTry30m: 67.43, pcaIntEurMin: 1.21, pcaDomTryMin: 0.66 },
      { maxMtow: 212, intEur30m: 195.33, domTry30m: 97.66, pcaIntEurMin: 1.48, pcaDomTryMin: 0.83 },
      { maxMtow: 300, intEur30m: 230.68, domTry30m: 115.79, pcaIntEurMin: 1.75, pcaDomTryMin: 1.01 },
      { maxMtow: 999, intEur30m: 259.01, domTry30m: 129.74, pcaIntEurMin: 1.75, pcaDomTryMin: 1.01 },
    ],
    bridgeUtilities: {
      power400Hz: { intEurPerMin: 2.23, domTryPerMin: 1.12 }, // Sayfa 16 (EUR/min)
      waterSupply: {
        lowIntEur: 22.75, highIntEur: 37.94,
        lowDomTry: 22.75, highDomTry: 37.94,
      },
      vdgs: { intEurPerUse: 10.00, domTryPerUse: 446.00 },
    },
    groundHandling: {
      passenger: [
        { maxSeats: 50, ramp: 14.87, paxSvc: 13.01, loadCtrl: 3.71, cargo: 5.57 },
        { maxSeats: 100, ramp: 42.78, paxSvc: 31.62, loadCtrl: 3.71, cargo: 18.59 },
        { maxSeats: 150, ramp: 87.43, paxSvc: 72.54, loadCtrl: 7.44, cargo: 37.19 },
        { maxSeats: 200, ramp: 111.61, paxSvc: 91.14, loadCtrl: 7.44, cargo: 50.22 },
        { maxSeats: 250, ramp: 143.23, paxSvc: 124.64, loadCtrl: 13.01, cargo: 61.38 },
        { maxSeats: 300, ramp: 174.86, paxSvc: 143.23, loadCtrl: 13.01, cargo: 72.54 },
        { maxSeats: 350, ramp: 191.60, paxSvc: 161.84, loadCtrl: 13.01, cargo: 93.01 },
        { maxSeats: 999, ramp: 228.81, paxSvc: 184.16, loadCtrl: 14.87, cargo: 98.58 },
      ]
    }
  }
};
