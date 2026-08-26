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
    // -------------------------------------------------------------
    // Sayfa 4 & 7: KONMA (LANDING) TARİFESİ
    // -------------------------------------------------------------
    landing: {
      istanbul: { international: 13.28, domestic: 43.33 },
      cukurova: { international: 12.76, domestic: 42.24 },
      zafer:    { international: 7.93,  domestic: 25.78 },
      tier1:    { international: 13.28, domestic: 43.33 },
      tier2:    { international: 6.34,  domestic: 20.70 },
    },

    // -------------------------------------------------------------
    // Sayfa 4 & 7: KONAKLAMA (PARKING) TARİFESİ (2 Saat Ücretsiz)
    // -------------------------------------------------------------
    parking: {
      freeHours: 2,
      istanbul: { international: 4.08, domestic: 13.02 },
      cukurova: { international: 3.92, domestic: 12.75 },
      zafer:    { international: 1.95, domestic: 10.56 },
      tier1:    { international: 4.08, domestic: 13.02 },
      tier2:    { international: 1.56, domestic: 8.22 },
    },

    // -------------------------------------------------------------
    // Sayfa 4 & 7: YAKLAŞMA (APPROACH CONTROL) TARİFESİ
    // -------------------------------------------------------------
    approach: {
      istanbul: { international: 74.40, domestic: 244.00 },
      cukurova: { international: 57.24, domestic: 188.00 },
      zafer:    { international: 57.24, domestic: 188.00 },
      tier1:    { international: 74.40, domestic: 244.00 },
      tier2:    { international: 57.24, domestic: 188.00 },
    },

    // -------------------------------------------------------------
    // Sayfa 4 & 7: PİST AYDINLATMA (LIGHTING) TARİFESİ
    // -------------------------------------------------------------
    lighting: {
      istanbul: { international: 81.84, domestic: 527.75 },
      cukurova: { international: 78.69, domestic: 580.00 },
      zafer:    { international: 77.27, domestic: 611.00 },
      tier1:    { international: 81.84, domestic: 527.75 },
      tier2:    { international: 62.95, domestic: 462.19 },
    },

    // -------------------------------------------------------------
    // Sayfa 10 & 11: YOLCU SERVİS & GÜVENLİK TARİFESİ
    // -------------------------------------------------------------
    passengerService: {
      istanbul: { international: 20.00, domestic: 3.00 }, // 3.00 EUR (veya 120 TL)
      esenboga: { international: 17.00, domestic: 3.00 },
      cukurova: { international: 15.00, domestic: 3.00 },
      antalya:  { international: 15.00, domestic: 3.00 },
      adb:      { international: 15.00, domestic: 3.00 },
      bjv:      { international: 15.00, domestic: 3.00 },
      dlm:      { international: 15.00, domestic: 3.00 },
      zafer:    { international: 10.00, domestic: 2.00 },
      gazipasa: { international: 12.00, domestic: 68.60 },
      zonguldak:{ international: 10.00, domestic: 54.90 },
      tier1:    { international: 15.00, domestic: 3.00 },
      tier2:    { international: 10.00, domestic: 54.90 },
    },

    passengerSecurity: {
      istanbul: { international: 3.04, domestic: 11.80 },
      cukurova: { international: 3.00, domestic: 11.80 },
      zafer:    { international: 2.00, domestic: 4.10 },
      tier1:    { international: 3.00, domestic: 11.80 },
      tier2:    { international: 2.00, domestic: 4.10 },
    },

    // -------------------------------------------------------------
    // Sayfa 13: EMNİYET TEDBİRİ (ARFF İTFAİYE) TARİFESİ
    // -------------------------------------------------------------
    arffSafety: {
      international: 273.29, // EUR / Saat
      domestic: 5866.00,     // TRY / Saat
    },

    // -------------------------------------------------------------
    // Sayfa 14: FOLLOW-ME / YÖNLENDİRME TARİFESİ
    // -------------------------------------------------------------
    followMe: {
      international: 112.35, // EUR / Operasyon
      domestic: 2709.00,     // TRY / Operasyon
    },

    // -------------------------------------------------------------
    // Sayfa 15: SAAT UZATMA TARİFESİ
    // -------------------------------------------------------------
    airportExtension: {
      international: 1029.50, // EUR / Saat
      domestic: 10012.00,     // TRY / Saat
    },

    // -------------------------------------------------------------
    // Sayfa 16: İSTANBUL HAVALİMANI (İGA KÖİ) YOLCU KÖPRÜSÜ & EKİPMANLARI (Tablo 2.a)
    // -------------------------------------------------------------
    bridgeRatesIstanbul: [
      { maxMtow: 50,  intEur30m: 61.84,  domTry30m: 31.14, pcaIntEurMin: 0.81, pcaDomTryMin: 0.51 },
      { maxMtow: 75,  intEur30m: 80.45,  domTry30m: 41.85, pcaIntEurMin: 0.81, pcaDomTryMin: 0.51 },
      { maxMtow: 106, intEur30m: 104.17, domTry30m: 52.08, pcaIntEurMin: 0.81, pcaDomTryMin: 0.51 },
      { maxMtow: 152, intEur30m: 134.87, domTry30m: 67.43, pcaIntEurMin: 1.21, pcaDomTryMin: 0.66 },
      { maxMtow: 212, intEur30m: 195.33, domTry30m: 97.66, pcaIntEurMin: 1.48, pcaDomTryMin: 0.83 },
      { maxMtow: 300, intEur30m: 230.68, domTry30m: 115.79, pcaIntEurMin: 1.75, pcaDomTryMin: 1.01 },
      { maxMtow: 999, intEur30m: 259.01, domTry30m: 129.74, pcaIntEurMin: 1.75, pcaDomTryMin: 1.01 },
    ],

    // Sayfa 16 Tablo 2.b (Antalya, ADB, BJV, DLM)
    bridgeRatesAntalyaGroup: [
      { maxMtow: 50,  intEur30m: 47.58,  domTry30m: 23.95, pcaIntEurMin: 0.63, pcaDomTryMin: 0.40 },
      { maxMtow: 75,  intEur30m: 61.88,  domTry30m: 32.19, pcaIntEurMin: 0.63, pcaDomTryMin: 0.40 },
      { maxMtow: 106, intEur30m: 80.13,  domTry30m: 40.06, pcaIntEurMin: 0.63, pcaDomTryMin: 0.40 },
      { maxMtow: 152, intEur30m: 103.74, domTry30m: 51.87, pcaIntEurMin: 0.94, pcaDomTryMin: 0.52 },
      { maxMtow: 212, intEur30m: 150.25, domTry30m: 75.12, pcaIntEurMin: 1.13, pcaDomTryMin: 0.65 },
      { maxMtow: 300, intEur30m: 177.43, domTry30m: 89.07, pcaIntEurMin: 1.35, pcaDomTryMin: 0.78 },
      { maxMtow: 999, intEur30m: 199.26, domTry30m: 99.80, pcaIntEurMin: 1.35, pcaDomTryMin: 0.78 },
    ],

    // Sayfa 16 Tablo 2.c (Çukurova, ESB)
    bridgeRatesCukurovaGroup: [
      { maxMtow: 50,  intEur30m: 59.38,  domTry30m: 30.04, pcaIntEurMin: 0.63, pcaDomTryMin: 0.33 },
      { maxMtow: 75,  intEur30m: 77.62,  domTry30m: 40.06, pcaIntEurMin: 0.63, pcaDomTryMin: 0.33 },
      { maxMtow: 106, intEur30m: 100.16, domTry30m: 50.08, pcaIntEurMin: 0.63, pcaDomTryMin: 0.33 },
      { maxMtow: 152, intEur30m: 129.51, domTry30m: 64.75, pcaIntEurMin: 0.91, pcaDomTryMin: 0.48 },
      { maxMtow: 212, intEur30m: 187.81, domTry30m: 94.08, pcaIntEurMin: 1.10, pcaDomTryMin: 0.58 },
      { maxMtow: 300, intEur30m: 221.80, domTry30m: 111.25, pcaIntEurMin: 1.35, pcaDomTryMin: 0.67 },
      { maxMtow: 999, intEur30m: 248.99, domTry30m: 124.85, pcaIntEurMin: 1.35, pcaDomTryMin: 0.67 },
    ],

    // -------------------------------------------------------------
    // Sayfa 16: GPU, SU VE VDGS BİRİM FİYATLARI
    // -------------------------------------------------------------
    bridgeUtilities: {
      istanbul: {
        power400Hz: { intEurPerMin: 2.23, domTryPerMin: 1.12 },
        waterSupply: { lowIntEur: 22.75, highIntEur: 37.94, lowDomTry: 22.75, highDomTry: 37.94 },
        vdgs: { intEurPerUse: 10.00, domTryPerUse: 446.00 }
      },
      antalyaGroup: {
        power400Hz: { intEurPerMin: 1.72, domTryPerMin: 0.87 },
        waterSupply: { lowIntEur: 17.51, highIntEur: 29.19, lowDomTry: 17.51, highDomTry: 29.19 },
        vdgs: { intEurPerUse: 10.00, domTryPerUse: 446.00 }
      },
      cukurovaGroup: {
        power400Hz: { intEurPerMin: 2.15, domTryPerMin: 1.09 },
        waterSupply: { lowIntEur: 21.89, highIntEur: 36.49, lowDomTry: 21.89, highDomTry: 36.49 },
        vdgs: { intEurPerUse: 10.00, domTryPerUse: 446.00 }
      }
    },

    // -------------------------------------------------------------
    // Sayfa 18: YER HİZMETLERİ DHMİ HAKK-I İMTİYAZ PAYI (Yolcu Uçakları)
    // -------------------------------------------------------------
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
