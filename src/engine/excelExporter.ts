import * as XLSX from 'xlsx';
import type { FleetSummaryResult, FlightScenario } from '../types/tariff';

export function exportFleetToExcel(
  fleetSummary: FleetSummaryResult,
  scenarios: FlightScenario[]
) {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: Executive Summary (Yönetici Özeti)
  // -------------------------------------------------------------
  const summaryRows = [
    ['DHMİ / KÖİ HAVALİMANI ÜCRET HESAPLAMA VE YÖNETİCİ ÖZETİ'],
    ['Oluşturulma Tarihi:', new Date().toLocaleDateString('tr-TR')],
    ['Havalimanı:', fleetSummary.byAirportName],
    ['Uygulanan EUR/TRY Kuru:', `${fleetSummary.exchangeRateEUR.toFixed(2)} TL`],
    [''],
    ['GENEL TOPLAMLAR (OVERALL KPI)'],
    ['Farklı Uçuş Senaryo Sayısı:', fleetSummary.totalFlights],
    ['Toplam Uçak Sayısı (Filo):', fleetSummary.totalAircraftCount],
    ['Toplam Giden Yolcu Sayısı:', fleetSummary.totalPassengers],
    ['Toplam Tutar (EUR):', `${fleetSummary.totalSubtotalEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €`],
    ['Toplam Tutar (TRY):', `${fleetSummary.totalSubtotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`],
    ['Toplam TL Karşılığı (EUR*Kur + TRY):', `${fleetSummary.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`],
    [''],
    ['FIYATA DAHİL EKİPMAN VE HİZMET KALEMLERİ DETAYLI KIRILIMI (EQUIPMENT BREAKDOWN)'],
    ['Ekipman / Hizmet Adı', 'Kategori', 'Toplam Miktar / Süre', 'EUR Tutar (€)', 'TRY Tutar (₺)', 'Toplam TL Karşılığı (₺)', 'Pay (%)'],
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
        item.totalAmountEUR > 0 ? item.totalAmountEUR.toFixed(2) : '-',
        item.totalAmountTRY > 0 ? item.totalAmountTRY.toFixed(2) : '-',
        item.totalConvertedTRY.toFixed(2),
        `%${share.toFixed(1)}`
      ]);
    });

  summaryRows.push(['']);
  summaryRows.push(['HİZMET KATEGORİSİ DAĞILIMI (CATEGORY BREAKDOWN)']);
  summaryRows.push(['Kategori', 'EUR Tutar (€)', 'TRY Tutar (₺)', 'Toplam TL Karşılığı (₺)']);

  fleetSummary.byCategory.forEach((cat) => {
    summaryRows.push([
      cat.category,
      cat.amountEUR.toFixed(2),
      cat.amountTRY.toFixed(2),
      cat.convertedTRY.toFixed(2),
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Yönetici Özeti');

  // -------------------------------------------------------------
  // Sheet 2: Detailed Line Items per Scenario
  // -------------------------------------------------------------
  const detailRows: any[][] = [
    [
      'Senaryo No',
      'Uçak Tipi',
      'Adet',
      'Kategori',
      'MTOW (Ton)',
      'Koltuk',
      'Yolcu Sayısı',
      'Park Süresi (sa)',
      'Hizmet Kalemi',
      'Birim Fiyat',
      'Para Birimi',
      'Miktar',
      'Uçak Başı Toplam',
      'Filo Toplam (Adet x Toplam)',
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
          item.unitPrice.toFixed(2),
          item.currency,
          item.quantity,
          item.total.toFixed(2),
          (item.total * sc.quantity).toFixed(2),
        ]);
      }
    });
  });

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detaylı Hizmet Dökümü');

  // Generate file download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `KOI_Ucret_Hesaplama_Raporu_${dateStr}.xlsx`);
}
