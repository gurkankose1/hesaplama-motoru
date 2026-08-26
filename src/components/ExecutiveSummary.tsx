import React from 'react';
import type { FleetSummaryResult, FlightScenario } from '../types/tariff';
import { Plane, Users, DollarSign, PieChart, Printer, FileSpreadsheet, Layers, Wrench } from 'lucide-react';

interface ExecutiveSummaryProps {
  fleetSummary: FleetSummaryResult;
  scenarios: FlightScenario[];
  exchangeRateEUR: number;
  onPrint: () => void;
  onExportExcel: () => void;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  fleetSummary,
  scenarios,
  exchangeRateEUR,
  onPrint,
  onExportExcel,
}) => {
  // Aggregate itemized line items across all scenarios for detailed equipment breakdown
  const itemizedBreakdownMap: Record<string, {
    name: string;
    category: string;
    currency: 'EUR' | 'TRY';
    unitPriceAvg: number;
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
            unitPriceAvg: item.unitPrice,
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

        current.totalConvertedTRY += (item.currency === 'EUR' ? item.total * exchangeRateEUR : item.total) * qty;
      }
    });
  });

  const itemizedList = Object.values(itemizedBreakdownMap).sort((a, b) => b.totalConvertedTRY - a.totalConvertedTRY);

  return (
    <div className="space-y-8 pb-20">
      
      {/* Executive Summary Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <PieChart className="w-3.5 h-3.5" />
              Yönetici Özeti & Finansal Rapor (Orijinal KÖİ Birimleri)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Havalimanı Ücret & KÖİ Maliyet Analizi
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              {fleetSummary.byAirportName} için hesaplanmış olan karma filo operasyonlarının ekibin kullandığı tüm ekipman, hizmet kalemleri ve finansal özeti.
            </p>
          </div>

          <div className="flex items-center gap-3 no-print">
            <button
              onClick={onExportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel Raporu (.xlsx)
            </button>
            <button
              onClick={onPrint}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Yazdır / PDF Rapor
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (Orijinal EUR ve TRY Tutarlar Ayrılmıştır) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Aircraft Count */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Toplam Filo / Uçak</span>
            <Plane className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {fleetSummary.totalAircraftCount} <span className="text-xs text-slate-400 font-normal">Uçak ({fleetSummary.totalFlights} Senaryo)</span>
          </div>
        </div>

        {/* Total Passengers */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Toplam Yolcu Hacmi</span>
            <Users className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {fleetSummary.totalPassengers.toLocaleString('tr-TR')} <span className="text-xs text-slate-400 font-normal">Pax</span>
          </div>
        </div>

        {/* Orijinal Euro & TL Tutarlar */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Orijinal Tarife Tutarları</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-lg font-extrabold text-emerald-400">
            {fleetSummary.totalSubtotalEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €
          </div>
          <div className="text-xs text-slate-400 mt-1">
            + {fleetSummary.totalSubtotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </div>
        </div>

        {/* Opsiyonel Çevrilmiş TL Karşılığı */}
        <div className="bg-gradient-to-br from-indigo-900/60 to-slate-800 border border-indigo-500/40 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-indigo-300 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">ÇEVRİLMİŞ TL KARŞILIĞI</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded">1 € = {exchangeRateEUR} TL</span>
          </div>
          <div className="text-2xl font-black text-amber-400">
            {fleetSummary.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </div>
        </div>

      </div>

      {/* DETAILED ITEMISED EQUIPMENT & SERVICE BREAKDOWN TABLE */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-emerald-400" />
          Fiyata Dahil Tüm Ekipman & Hizmet Kalemleri Detaylı Kırılımı
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Seçilen uçuş senaryolarında tiklenmiş ve hesaba katılmış olan tüm ekipmanların (Körük, GPU, PCA, Su vb.) toplam miktarları ve tutar dökümü.
        </p>

        <div className="overflow-x-auto border border-slate-700/70 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-700/70">
              <tr>
                <th className="p-3">Ekipman / Hizmet Adı</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-right">Toplam Miktar / Süre</th>
                <th className="p-3 text-right">Euro Tutar (€)</th>
                <th className="p-3 text-right">TL Tutar (₺)</th>
                <th className="p-3 text-right">Çevrilmiş TL Karşılığı (₺)</th>
                <th className="p-3 text-right">Toplam İçindeki Payı (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
              {itemizedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-500 italic">
                    Henüz hiçbir ekipman veya hizmet seçilmedi.
                  </td>
                </tr>
              ) : (
                itemizedList.map((item) => {
                  const sharePercentage = fleetSummary.totalConvertedTRY > 0
                    ? (item.totalConvertedTRY / fleetSummary.totalConvertedTRY) * 100
                    : 0;

                  return (
                    <tr key={item.name} className="hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-slate-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        {item.name}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-amber-300">
                        {item.totalQuantity.toLocaleString('tr-TR')}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        {item.totalAmountEUR > 0 ? `${item.totalAmountEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €` : '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        {item.totalAmountTRY > 0 ? `${item.totalAmountTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '-'}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-300">
                        {item.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="p-3 text-right font-semibold text-indigo-300">
                        %{sharePercentage.toFixed(1)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Breakdown Progress Bars & Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-indigo-400" />
          Hizmet Kategorilerine Göre Harcama Dağılımı
        </h3>

        <div className="space-y-4 mb-6">
          {fleetSummary.byCategory.map((cat) => {
            const percentage = fleetSummary.totalConvertedTRY > 0
              ? (cat.convertedTRY / fleetSummary.totalConvertedTRY) * 100
              : 0;

            return (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{cat.category}</span>
                  <span className="font-bold text-slate-300">
                    {cat.amountEUR > 0 && `${cat.amountEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €`}
                    {cat.amountEUR > 0 && cat.amountTRY > 0 && ' + '}
                    {cat.amountTRY > 0 && `${cat.amountTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                    {' '}(%{percentage.toFixed(1)})
                  </span>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Category Table */}
        <div className="overflow-x-auto border border-slate-700/70 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-700/70">
              <tr>
                <th className="p-3">Hizmet Kategorisi</th>
                <th className="p-3 text-right">Orijinal Euro Tutar (€)</th>
                <th className="p-3 text-right">Orijinal TL Tutar (₺)</th>
                <th className="p-3 text-right">Çevrilmiş TL Karşılığı (₺)</th>
                <th className="p-3 text-right">Pay (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
              {fleetSummary.byCategory.map((cat) => {
                const percentage = fleetSummary.totalConvertedTRY > 0
                  ? (cat.convertedTRY / fleetSummary.totalConvertedTRY) * 100
                  : 0;

                return (
                  <tr key={cat.category} className="hover:bg-slate-800/50">
                    <td className="p-3 font-semibold text-slate-100">{cat.category}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">{cat.amountEUR > 0 ? `${cat.amountEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €` : '-'}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">{cat.amountTRY > 0 ? `${cat.amountTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '-'}</td>
                    <td className="p-3 text-right font-bold text-slate-200">{cat.convertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                    <td className="p-3 text-right font-semibold text-indigo-300">%{percentage.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fleet Scenarios Breakdown Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          Filo Uçak Bazlı Maliyet Özeti
        </h3>

        <div className="overflow-x-auto border border-slate-700/70 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-700/70">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Uçak Tipi</th>
                <th className="p-3 text-center">Adet</th>
                <th className="p-3 text-center">Uçuş Tipi</th>
                <th className="p-3 text-right">MTOW</th>
                <th className="p-3 text-right">Giden Yolcu</th>
                <th className="p-3 text-right">Park (sa)</th>
                <th className="p-3 text-right">Uçak Başı Tutar (Orijinal)</th>
                <th className="p-3 text-right">Filo Toplam (EUR & TRY)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
              {scenarios.map((sc, idx) => {
                const res = fleetSummary.resultsByScenario[idx];
                return (
                  <tr key={sc.id} className="hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-indigo-400">#{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-100">{sc.aircraftType}</td>
                    <td className="p-3 text-center font-bold text-amber-400">x{sc.quantity}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sc.flightCategory === 'INTERNATIONAL' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {sc.flightCategory === 'INTERNATIONAL' ? 'Dış Hat' : 'İç Hat'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium">{sc.mtow} t</td>
                    <td className="p-3 text-right font-medium">{sc.passengerCount} pax</td>
                    <td className="p-3 text-right font-medium">{sc.parkingHours} sa</td>
                    <td className="p-3 text-right font-bold text-amber-300">
                      {res.perAircraftEUR > 0 && `${res.perAircraftEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €`}
                      {res.perAircraftEUR > 0 && res.perAircraftTRY > 0 && ' + '}
                      {res.perAircraftTRY > 0 && `${res.perAircraftTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      {res.subtotalEUR > 0 && `${res.subtotalEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €`}
                      {res.subtotalEUR > 0 && res.subtotalTRY > 0 && ' + '}
                      {res.subtotalTRY > 0 && `${res.subtotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
