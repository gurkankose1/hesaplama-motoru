import * as XLSX from 'xlsx';
import type { FleetSummaryResult, FlightScenario } from '../types/tariff';

export function exportFleetToExcel(
  fleetSummary: FleetSummaryResult,
  scenarios: FlightScenario[]
) {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: Yönetici Özeti (Executive Summary & Equipment Breakdown)
  // -------------------------------------------------------------
  const summaryRows: any[][] = [
    ['DHMİ / KÖİ HAVALİMANI ÜCRET HESAPLAMA VE YÖNETİCİ ÖZETİ (2026 REV.01)'],
    ['Oluşturulma Tarihi:', new Date().toLocaleDateString('tr-TR')],
    ['Seçili Havalimanı:', fleetSummary.byAirportName],
    ['Uygulanan Döviz Kuru:', `1 Euro = ${fleetSummary.exchangeRateEUR.toFixed(2)} TL`],
    [''],
    ['========================================================================================'],
    ['GENEL FİLO TOPLAMLARI (OVERALL FLEET KPI)'],
    ['========================================================================================'],
    ['Farklı Senaryo Sayısı:', fleetSummary.totalFlights],
    ['Toplam Uçak Sayısı (Filo):', fleetSummary.totalAircraftCount],
    ['Toplam Giden Yolcu Sayısı:', fleetSummary.totalPassengers],
    ['Orijinal Toplam Tutar (EUR):', fleetSummary.totalSubtotalEUR],
    ['Orijinal Toplam Tutar (TRY):', fleetSummary.totalSubtotalTRY],
    ['Çevrilmiş Toplam TL Karşılığı:', fleetSummary.totalConvertedTRY],
    [''],
    ['========================================================================================'],
    ['FİYATA DAHİL TÜM EKİPMAN VE HİZMET KALEMLERİ DETAYLI KIRILIMI (EQUIPMENT BREAKDOWN)'],
    ['========================================================================================'],
    ['Ekipman / Hizmet Adı', 'Hizmet Kategorisi', 'Toplam Miktar / Süre', 'Euro Tutar (€)', 'TL Tutar (₺)', 'Çevrilmiş TL (₺)', 'Filo Payı (%)'],
  ];

  // Aggregate itemized breakdown
  const itemizedBreakdownMap: Record<string, {
    name: string;
    category: string;
    currency: 'EUR' | 'TRY';
    totalQuantity: number;
    totalAmountEUR: number;
    totalAmountTRY: number;
    totalConvertedTRY: number;
  }> = {};

  fleetSummary.resultsByScenario.forEach((res, idx) => {
    const sc = scenarios[idx];
    const qty = sc.quantity;

    res.lineItems.forEach((item) => {
      if (item.enabled) {
        const key = item.id;
        if (!itemizedBreakdownMap[key]) {
          itemizedBreakdownMap[key] = {
            name: item.name,
            category: item.category,
            currency: item.currency,
            totalQuantity: 0,
            totalAmountEUR: 0,
            totalAmountTRY: 0,
            totalConvertedTRY: 0,
          };
        }

        const current = itemizedBreakdownMap[key];
        current.totalQuantity += item.quantity * qty;

        if (item.currency === 'EUR') {
          current.totalAmountEUR += item.total * qty;
        } else {
          current.totalAmountTRY += item.total * qty;
        }

        current.totalConvertedTRY += (item.currency === 'EUR' ? item.total * fleetSummary.exchangeRateEUR : item.total) * qty;
      }
    });
  });

  Object.values(itemizedBreakdownMap)
    .sort((a, b) => b.totalConvertedTRY - a.totalConvertedTRY)
    .forEach((item) => {
      const share = fleetSummary.totalConvertedTRY > 0 ? (item.totalConvertedTRY / fleetSummary.totalConvertedTRY) * 100 : 0;
      summaryRows.push([
        item.name,
        item.category,
        item.totalQuantity,
        item.totalAmountEUR > 0 ? item.totalAmountEUR : 0,
        item.totalAmountTRY > 0 ? item.totalAmountTRY : 0,
        item.totalConvertedTRY,
        `%${share.toFixed(1)}`
      ]);
    });

  summaryRows.push(['']);
  summaryRows.push(['========================================================================================']);
  summaryRows.push(['HİZMET KATEGORİSİ DAĞILIMI (CATEGORY BREAKDOWN)']);
  summaryRows.push(['========================================================================================']);
  summaryRows.push(['Kategori', 'EUR Tutar (€)', 'TRY Tutar (₺)', 'Çevrilmiş Toplam TL (₺)', 'Kategori Payı (%)']);

  fleetSummary.byCategory.forEach((cat) => {
    const share = fleetSummary.totalConvertedTRY > 0 ? (cat.convertedTRY / fleetSummary.totalConvertedTRY) * 100 : 0;
    summaryRows.push([
      cat.category,
      cat.amountEUR,
      cat.amountTRY,
      cat.convertedTRY,
      `%${share.toFixed(1)}`
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

  // Set column widths for Sheet 1
  wsSummary['!cols'] = [
    { wch: 45 }, // Ekipman Adı
    { wch: 25 }, // Kategori
    { wch: 22 }, // Miktar
    { wch: 20 }, // EUR Tutar
    { wch: 20 }, // TRY Tutar
    { wch: 25 }, // Çevrilmiş TL
    { wch: 15 }, // Pay
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Yönetici Özeti');

  // -------------------------------------------------------------
  // Sheet 2: Detaylı Hizmet & Şeffaf Formül Dökümü
  // -------------------------------------------------------------
  const detailRows: any[][] = [
    [
      'Senaryo No',
      'Uçak Tipi',
      'Uçak Adedi',
      'Uçuş Tipi',
      'MTOW (Ton)',
      'Koltuk',
      'Giden Yolcu',
      'Park Süresi (sa)',
      'Hizmet Kalemi',
      'Birim Fiyat',
      'Para Birimi',
      'Miktar / Süre',
      'Şeffaf Tarife Formülü / Çarpan Detayı',
      'Uçak Başı Tutar',
      'Filo Toplam Tutar',
    ]
  ];

  fleetSummary.resultsByScenario.forEach((res, index) => {
    const sc = scenarios[index];
    res.lineItems.forEach((item) => {
      if (item.enabled) {
        detailRows.push([
          `Senaryo #${index + 1}`,
          sc.aircraftType,
          sc.quantity,
          sc.flightCategory === 'INTERNATIONAL' ? 'Dış Hat' : 'İç Hat',
          sc.mtow,
          sc.seats,
          sc.passengerCount,
          sc.parkingHours,
          item.name,
          item.unitPrice,
          item.currency,
          item.quantity,
          item.formulaDetails || item.description,
          item.total,
          item.total * sc.quantity,
        ]);
      }
    });
  });

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);

  // Set column widths for Sheet 2
  wsDetail['!cols'] = [
    { wch: 12 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 35 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
    { wch: 65 }, // Şeffaf Formül
    { wch: 18 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detaylı Hizmet Dökümü');

  // Generate file download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `DHMI_KOI_Ucret_Hesaplama_Raporu_${dateStr}.xlsx`);
}
