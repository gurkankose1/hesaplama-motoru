import * as XLSX from 'xlsx';
import type { FleetSummaryResult, FlightScenario } from '../types/tariff';

export function exportFleetToExcel(
  fleetSummary: FleetSummaryResult,
  scenarios: FlightScenario[]
) {
  const wb = XLSX.utils.book_new();

  // Helper for formatting currency string clearly (e.g. 1.250,50 € or 450,00 ₺)
  const formatCurrencyStr = (amount: number, currency: 'EUR' | 'TRY') => {
    if (!amount || amount === 0) return '-';
    const formattedNum = amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formattedNum} ${currency === 'EUR' ? '€' : '₺'}`;
  };

  // -------------------------------------------------------------
  // Sheet 1: Özet Rapor (Executive Summary)
  // -------------------------------------------------------------
  const summaryRows: any[][] = [
    ['DHMİ / KÖİ HAVALİMANI ÜCRET HESAPLAMA RAPORU (2026 REV.01)'],
    ['Rapor Tarihi:', new Date().toLocaleDateString('tr-TR')],
    ['Havalimanı:', fleetSummary.byAirportName],
    ['Filo Toplam Uçak:', `${fleetSummary.totalAircraftCount} Uçak (${fleetSummary.totalFlights} Senaryo)`],
    ['Toplam Giden Yolcu:', `${fleetSummary.totalPassengers.toLocaleString('tr-TR')} Pax`],
    ['TOPLAM EURO TUTAR:', formatCurrencyStr(fleetSummary.totalSubtotalEUR, 'EUR')],
    ['TOPLAM TL TUTAR:', formatCurrencyStr(fleetSummary.totalSubtotalTRY, 'TRY')],
    [''],
    ['HİZMET VE EKİPMAN DÖKÜMÜ'],
    ['Ekipman / Hizmet Adı', 'Hizmet Kategorisi', 'Toplam Miktar / Süre', 'Toplam Tutar (Orijinal Birim)']
  ];

  // Aggregate itemized breakdown
  const itemizedBreakdownMap: Record<string, {
    name: string;
    category: string;
    currency: 'EUR' | 'TRY';
    totalQuantity: number;
    totalAmount: number;
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
            totalAmount: 0,
          };
        }

        const current = itemizedBreakdownMap[key];
        current.totalQuantity += item.quantity * qty;
        current.totalAmount += item.total * qty;
      }
    });
  });

  Object.values(itemizedBreakdownMap)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .forEach((item) => {
      summaryRows.push([
        item.name,
        item.category,
        item.totalQuantity.toLocaleString('tr-TR'),
        formatCurrencyStr(item.totalAmount, item.currency)
      ]);
    });

  summaryRows.push(['']);
  summaryRows.push(['KATEGORİ BAZLI TOPLAMLAR']);
  summaryRows.push(['Hizmet Kategorisi', 'Toplam Tutar (Orijinal Birim)']);

  fleetSummary.byCategory.forEach((cat) => {
    let totalStr = '';
    if (cat.amountEUR > 0 && cat.amountTRY > 0) {
      totalStr = `${formatCurrencyStr(cat.amountEUR, 'EUR')} + ${formatCurrencyStr(cat.amountTRY, 'TRY')}`;
    } else if (cat.amountEUR > 0) {
      totalStr = formatCurrencyStr(cat.amountEUR, 'EUR');
    } else {
      totalStr = formatCurrencyStr(cat.amountTRY, 'TRY');
    }

    summaryRows.push([
      cat.category,
      totalStr
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

  // Set column widths for Sheet 1
  wsSummary['!cols'] = [
    { wch: 45 }, // Ekipman / Hizmet Adı
    { wch: 25 }, // Kategori
    { wch: 20 }, // Miktar
    { wch: 30 }, // Toplam Tutar
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ozet_Rapor');

  // -------------------------------------------------------------
  // Sheet 2: Uçak Bazlı Hizmet Detayı
  // -------------------------------------------------------------
  const detailRows: any[][] = [
    [
      'Senaryo',
      'Uçak Tipi',
      'Adet',
      'Hat',
      'MTOW (Ton)',
      'Koltuk',
      'Giden Yolcu',
      'Park (sa)',
      'Hizmet Kalemi',
      'Birim Fiyat',
      'Miktar',
      'Tutar (Orijinal)',
      'Tarife Bağıntısı / Detay'
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
          formatCurrencyStr(item.unitPrice, item.currency),
          item.quantity,
          formatCurrencyStr(item.total * sc.quantity, item.currency),
          item.formulaDetails || item.description
        ]);
      }
    });
  });

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);

  // Set column widths for Sheet 2
  wsDetail['!cols'] = [
    { wch: 12 }, // Senaryo
    { wch: 25 }, // Uçak Tipi
    { wch: 8 },  // Adet
    { wch: 10 }, // Hat
    { wch: 12 }, // MTOW
    { wch: 10 }, // Koltuk
    { wch: 12 }, // Yolcu
    { wch: 10 }, // Park
    { wch: 35 }, // Hizmet Kalemi
    { wch: 18 }, // Birim Fiyat
    { wch: 10 }, // Miktar
    { wch: 20 }, // Tutar
    { wch: 60 }  // Tarife Bağıntısı
  ];

  XLSX.utils.book_append_sheet(wb, wsDetail, 'Ucak_Bazli_Detay');

  // Generate file download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `KOI_Ucret_Hesaplama_Raporu_${dateStr}.xlsx`);
}
