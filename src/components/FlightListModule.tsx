import React, { useState } from 'react';
import type { Airport, TariffVersion } from '../types/tariff';
import type { FlightListSummary, FlightRecord, RevenueOptions } from '../types/flightList';
import { parseIhkFlightReport } from '../engine/flightListParser';
import { calculateFlightListSummary, DEFAULT_REVENUE_OPTIONS } from '../engine/flightListRevenueEngine';
import { FileSpreadsheet, Upload, CheckCircle2, Sparkles, Sliders, Layers, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FlightListModuleProps {
  selectedAirport: Airport;
  exchangeRateEUR: number;
  tariffVersion: TariffVersion;
}

export const FlightListModule: React.FC<FlightListModuleProps> = ({
  selectedAirport,
  exchangeRateEUR,
  tariffVersion,
}) => {
  // Operating Mode: 'actual' (Gerçekleşmiş Uçuşlar + İsteğe bağlı kullanım dosyaları) vs 'forecast' (Gelecek Uçuşlar + Tüketim Alışkanlıkları)
  const [moduleMode, setModuleMode] = useState<'actual' | 'forecast'>('forecast');

  // Revenue Checkbox Options
  const [options, setOptions] = useState<RevenueOptions>(DEFAULT_REVENUE_OPTIONS);

  // File Upload States
  const [flightReportFile, setFlightReportFile] = useState<File | null>(null);

  // Parsed Flights & Calculated Summary State
  const [parsedFlights, setParsedFlights] = useState<FlightRecord[]>([]);
  const [summary, setSummary] = useState<FlightListSummary | null>(null);

  // Table Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'INTERNATIONAL' | 'DOMESTIC'>('ALL');
  const [standFilter, setStandFilter] = useState<'ALL' | 'BRIDGE' | 'OPEN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EXECUTED' | 'CANCELLED'>('EXECUTED');

  // Handle Flight Report Excel File Upload & Parse
  const handleFlightReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFlightReportFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const records = parseIhkFlightReport(buffer);
      setParsedFlights(records);

      // Immediately calculate summary
      const sum = calculateFlightListSummary(records, selectedAirport, exchangeRateEUR, options, tariffVersion);
      setSummary(sum);
    } catch (err) {
      console.error('File parsing error:', err);
      alert('Uçuş listesi Excel dosyası okunamadı. Lütfen geçerli bir IHK Report formatı yükleyin.');
    }
  };

  // Recalculate summary when options or airport/exchange rate changes
  const handleRecalculate = (newOptions: RevenueOptions) => {
    setOptions(newOptions);
    if (parsedFlights.length > 0) {
      const sum = calculateFlightListSummary(parsedFlights, selectedAirport, exchangeRateEUR, newOptions, tariffVersion);
      setSummary(sum);
    }
  };

  // Export Revenue Summary to Excel
  const handleExportExcel = () => {
    if (!summary || summary.results.length === 0) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Gelir Özet Raporu
    const summaryRows: any[][] = [
      ['DHMİ / KÖİ UÇUŞ LİSTESİ GELİR TAHMİN VE ANALİZ RAPORU (2026)'],
      ['Oluşturulma Tarihi:', new Date().toLocaleDateString('tr-TR')],
      ['Havalimanı:', selectedAirport.name],
      ['Hesaplama Modu:', moduleMode === 'forecast' ? 'Tahmini / Gelecek Uçuşlar (Tüketim Alışkanlıkları)' : 'Gerçekleşmiş Uçuşlar'],
      ['Uygulanan Döviz Kuru:', `1 Euro = ${exchangeRateEUR.toFixed(2)} TL`],
      [''],
      ['GENEL TOPLAMLAR'],
      ['Toplam Yüklenen Uçuş:', summary.totalFlights],
      ['Gerçekleşen Uçuş Sayısı:', summary.executedFlights],
      ['İptal Edilen Uçuş (DX):', summary.cancelledFlights],
      ['Köprülü Park Uçuşları:', summary.bridgeStandFlights],
      ['Açık Pozisyon Uçuşları:', summary.openStandFlights],
      ['Toplam Giden Yolcu (Pax):', summary.totalPassengers],
      ['Orijinal Toplam EUR Gelir:', `${summary.totalSubtotalEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €`],
      ['Orijinal Toplam TRY Gelir:', `${summary.totalSubtotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`],
      ['Çevrilmiş Toplam TL Karşılığı:', `${summary.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Gelir_Ozet_Raporu');

    // Sheet 2: Uçuş Bazlı Gelir Detayı
    const detailRows: any[][] = [
      [
        '#',
        'Havayolu',
        'Geliş Sefer',
        'Gidiş Sefer',
        'Tescil (RegNo)',
        'Uçak Tipi',
        'Kategori',
        'MTOW (Ton)',
        'Uçuş Tipi',
        'Durum',
        'Park Alanı',
        'Stand',
        'Park Tipi',
        'Park Süresi (sa)',
        'PBB (dk)',
        'GPU (dk)',
        'PCA (dk)',
        'Su (Adet)',
        'Giden Yolcu',
        'Orijinal EUR Gelir',
        'Orijinal TRY Gelir',
        'Çevrilmiş TL Gelir',
        'Notlar / Alışkanlık Açıklaması'
      ]
    ];

    summary.results.forEach((res, i) => {
      const fl = res.flight;
      detailRows.push([
        i + 1,
        fl.airline,
        fl.arrFlightNo,
        fl.depFlightNo,
        fl.regNo,
        fl.aircraftType,
        fl.aircraftCategory,
        fl.mtowTon,
        fl.flightCategory === 'INTERNATIONAL' ? 'Dış Hat' : 'İç Hat',
        fl.isCancelled ? 'İptal (DX)' : 'Gerçekleşti',
        fl.standArea,
        fl.stand,
        fl.isOpenStand ? 'Açık Pozisyon' : 'Köprü',
        res.groundTimeHours,
        res.pbbMinsUsed,
        res.gpuMinsUsed,
        res.pcaMinsUsed,
        res.waterCountUsed,
        fl.depPax || fl.arrPax || 0,
        res.subtotalEUR,
        res.subtotalTRY,
        res.totalConvertedTRY,
        res.notes.join(' | ')
      ]);
    });

    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    wsDetail['!cols'] = [
      { wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 10 },
      { wch: 15 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 60 }
    ];

    XLSX.utils.book_append_sheet(wb, wsDetail, 'Ucus_Bazli_Gelir_Detayi');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Ucus_Listesi_Gelir_Raporu_${dateStr}.xlsx`);
  };

  // Filtered results for display
  const filteredResults = (summary?.results || []).filter((res) => {
    const fl = res.flight;

    // Status filter
    if (statusFilter === 'EXECUTED' && fl.isCancelled) return false;
    if (statusFilter === 'CANCELLED' && !fl.isCancelled) return false;

    // Category filter
    if (categoryFilter !== 'ALL' && fl.flightCategory !== categoryFilter) return false;

    // Stand filter
    if (standFilter === 'BRIDGE' && !fl.isBridgeStand) return false;
    if (standFilter === 'OPEN' && !fl.isOpenStand) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        fl.airline.toLowerCase().includes(q) ||
        fl.arrFlightNo.toLowerCase().includes(q) ||
        fl.depFlightNo.toLowerCase().includes(q) ||
        fl.regNo.toLowerCase().includes(q) ||
        fl.aircraftType.toLowerCase().includes(q) ||
        fl.standArea.toLowerCase().includes(q) ||
        fl.stand.toLowerCase().includes(q);

      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-28">
      
      {/* Module Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Uçuş Listesi Gelir Hesaplama & Tüketim Alışkanlıkları Modülü
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Uçuş Listesinden Otomatik Gelir Tablosu
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Yüklediğiniz uçuş listesindeki ({selectedAirport.name}) uçakların park konumlarına (Köprü vs. Açık), kalış sürelerine ve 110 havayolunun 1 aylık geçmiş tüketim alışkanlıklarına göre tahmini veya gerçekleşmiş gelir dökümünü hesaplayın.
            </p>
          </div>

          {/* Export Excel Button */}
          {summary && summary.results.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl shadow-emerald-600/20 transition-all flex-shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Gelir Raporunu Excel Olarak İndir (.xlsx)
            </button>
          )}
        </div>
      </div>

      {/* Module Mode Selection Tabs */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2 shadow-lg flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => setModuleMode('forecast')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold transition-all ${
            moduleMode === 'forecast'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Modül B: Tahmini / İleri Tarihli Uçuş Listesi (Tüketim Alışkanlıkları İle Hesapla)
        </button>

        <button
          onClick={() => setModuleMode('actual')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold transition-all ${
            moduleMode === 'actual'
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Modül A: Gerçekleşmiş Uçuş Listesi (+ İsteğe Bağlı PBB, GPU, PCA, Su Kullanım Dosyaları)
        </button>
      </div>

      {/* File Upload Dropzones Grid */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-400" />
          {moduleMode === 'forecast' ? 'Uçuş Listesi Excel Dosyası Yükleyin' : 'Gerçekleşmiş Uçuş Listesi & Kullanım Dosyaları Yükleyin'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Main Flight Report Upload Box */}
          <div className="bg-slate-900 border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-5 text-center space-y-3 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-xs font-bold text-white">1. Uçuş Listesi Dosyası (IHK_Report.xlsx)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Uçak tipleri, MTOW, ATA/ATD, park konumları ve hat verilerini içerir.</p>
            </div>

            <label className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-md transition-all">
              <Upload className="w-3.5 h-3.5" />
              {flightReportFile ? flightReportFile.name : 'Uçuş Listesi Excel Seç'}
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFlightReportUpload}
                className="hidden"
              />
            </label>

            {flightReportFile && (
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Yüklendi ve {summary?.totalFlights || 0} uçuş başarıyla okundu!
              </div>
            )}
          </div>

          {/* Mode A Optional Usage Files Notice / Uploads */}
          {moduleMode === 'actual' ? (
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 text-xs space-y-3">
              <span className="font-bold text-slate-200 block">2. İsteğe Bağlı Ek Kullanım Dosyaları:</span>
              <p className="text-[10px] text-slate-400">
                PBB, GPU, PCA ve Su tüketim Excel dosyalarınız varsa yükleyebilirsiniz. Yüklenmeyen hizmetler için havayolunun 1 aylık geçmiş tüketim ortalamaları otomatik devreye girer.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-2 cursor-pointer hover:border-slate-500">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                  <span className="truncate text-slate-300">GPU Dosyası</span>
                  <input type="file" accept=".xlsx" className="hidden" />
                </label>

                <label className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-2 cursor-pointer hover:border-slate-500">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="truncate text-slate-300">PCA Dosyası</span>
                  <input type="file" accept=".xlsx" className="hidden" />
                </label>

                <label className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-2 cursor-pointer hover:border-slate-500">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate text-slate-300">PBB Dosyası</span>
                  <input type="file" accept=".xlsx" className="hidden" />
                </label>

                <label className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-2 cursor-pointer hover:border-slate-500">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="truncate text-slate-300">Su Dosyası</span>
                  <input type="file" accept=".xlsx" className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 text-xs space-y-2 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Otomatik Akıllı Tüketim Motoru Aktif
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                İleri tarihli veya süresi henüz girilmemiş uçuş listenizde, 110 havayolunun 1 aylık geçmiş tüketim alışkanlıkları (THY, Aeroflot, Emirates, Qatar, Lufthansa vb.) ve uçak gövde kategorileri (Narrowbody, Widebody, Super Widebody) otomatik analiz edilip hesaba katılır.
              </p>
            </div>
          )}

        </div>

        {/* Revenue Options Checkboxes Drawer */}
        <div className="pt-3 border-t border-slate-700/80">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Hesaplamaya Dahil Edilecek Hizmet Kalemleri Opsiyonları:
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includeLanding} onChange={(e) => handleRecalculate({ ...options, includeLanding: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">Konma (Landing)</span>
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includeParking} onChange={(e) => handleRecalculate({ ...options, includeParking: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">Konaklama (Parking)</span>
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includeApproach} onChange={(e) => handleRecalculate({ ...options, includeApproach: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">Yaklaşma</span>
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includeLighting} onChange={(e) => handleRecalculate({ ...options, includeLighting: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">Aydınlatma</span>
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includePaxSvcSec} onChange={(e) => handleRecalculate({ ...options, includePaxSvcSec: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">Yolcu Servis & Güvenlik</span>
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includeBridgePbb} onChange={(e) => handleRecalculate({ ...options, includeBridgePbb: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">Köprü (PBB)</span>
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includeGpu} onChange={(e) => handleRecalculate({ ...options, includeGpu: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">GPU (400Hz)</span>
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includePca} onChange={(e) => handleRecalculate({ ...options, includePca: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">PCA Havalandırma</span>
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includeWater} onChange={(e) => handleRecalculate({ ...options, includeWater: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">Su Hizmeti</span>
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includeVdgs} onChange={(e) => handleRecalculate({ ...options, includeVdgs: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">VDGS Park</span>
            </label>

            <label className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input type="checkbox" checked={options.includeGroundHandling} onChange={(e) => handleRecalculate({ ...options, includeGroundHandling: e.target.checked })} className="rounded text-indigo-600" />
              <span className="text-slate-200">Yer Hizmetleri Payı</span>
            </label>
          </div>
        </div>

      </div>

      {/* Calculated KPI Cards Grid */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Toplam Uçuş</span>
            <div className="text-xl font-extrabold text-white mt-1">
              {summary.totalFlights.toLocaleString('tr-TR')} <span className="text-xs text-slate-400 font-normal">Uçuş</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 font-semibold">
              {summary.executedFlights} Gerçekleşti, {summary.cancelledFlights} İptal (DX)
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Park Konumu Dağılımı</span>
            <div className="text-xl font-extrabold text-indigo-300 mt-1">
              {summary.bridgeStandFlights} <span className="text-xs text-slate-400 font-normal">Köprü</span> / {summary.openStandFlights} <span className="text-xs text-slate-400 font-normal">Açık</span>
            </div>
            <div className="text-[10px] text-amber-400 mt-1 font-semibold">
              Açık pozisyonlarda köprü/ekipman harçsız
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Toplam Yolcu (Pax)</span>
            <div className="text-xl font-extrabold text-sky-300 mt-1">
              {summary.totalPassengers.toLocaleString('tr-TR')} <span className="text-xs text-slate-400 font-normal">Pax</span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Orijinal Tarife Geliri</span>
            <div className="text-base font-extrabold text-amber-300 mt-1">
              {summary.totalSubtotalEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €
            </div>
            <div className="text-xs text-slate-300 font-bold">
              + {summary.totalSubtotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900/80 to-slate-800 border border-indigo-500/40 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Çevrilmiş Toplam TL</span>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {summary.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </div>
            <div className="text-[10px] text-indigo-300 mt-0.5">
              1 € = {exchangeRateEUR} TL
            </div>
          </div>

        </div>
      )}

      {/* Interactive Flight Revenue List Table */}
      {summary && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
          
          {/* Table Search & Filters Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
            
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Havayolu, Uçuş No, Tescil (RegNo), Uçak Tipi veya Park Yeri Ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none"
              >
                <option value="ALL">Tüm Hatlar</option>
                <option value="INTERNATIONAL">Dış Hat</option>
                <option value="DOMESTIC">İç Hat</option>
              </select>

              {/* Stand Filter */}
              <select
                value={standFilter}
                onChange={(e) => setStandFilter(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none"
              >
                <option value="ALL">Tüm Park Tipleri</option>
                <option value="BRIDGE">Köprülü Pozisyonlar</option>
                <option value="OPEN">Açık Pozisyonlar</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none"
              >
                <option value="EXECUTED">Gerçekleşen Uçuşlar</option>
                <option value="CANCELLED">İptal Uçuşlar (DX)</option>
                <option value="ALL">Tüm Durumlar</option>
              </select>
            </div>

          </div>

          {/* Results Count Badge */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Gösterilen: <strong className="text-slate-200">{filteredResults.length}</strong> / {summary.results.length} Uçuş</span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-slate-700/70 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-700/70">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Havayolu</th>
                  <th className="p-3">Sefer No</th>
                  <th className="p-3 text-center">Tescil / Tip</th>
                  <th className="p-3 text-right">MTOW</th>
                  <th className="p-3 text-center">Hat</th>
                  <th className="p-3">Park Konumu</th>
                  <th className="p-3 text-right">Kalış</th>
                  <th className="p-3 text-center">PBB / GPU / PCA</th>
                  <th className="p-3 text-right">Hesaplanan Gelir (Orijinal)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-500 italic">
                      Filtrelere uygun uçuş bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((res, idx) => {
                    const fl = res.flight;
                    return (
                      <React.Fragment key={fl.id}>
                        <tr className={`hover:bg-slate-800/50 ${fl.isCancelled ? 'opacity-40 bg-rose-950/20' : ''}`}>
                          <td className="p-3 font-bold text-slate-400">#{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-100">{fl.airline}</td>
                          <td className="p-3 font-semibold text-indigo-300">{fl.arrFlightNo || fl.depFlightNo || '-'}</td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-slate-200 block">{fl.aircraftType}</span>
                            <span className="text-[10px] text-slate-400 block">{fl.regNo} (Kat: {fl.aircraftCategory})</span>
                          </td>
                          <td className="p-3 text-right font-medium">{fl.mtowTon} t</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              fl.flightCategory === 'INTERNATIONAL' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {fl.flightCategory === 'INTERNATIONAL' ? 'Dış Hat' : 'İç Hat'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              fl.isBridgeStand ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {fl.standArea} - {fl.stand} ({fl.isBridgeStand ? 'Köprü' : 'Açık'})
                            </span>
                          </td>
                          <td className="p-3 text-right font-medium">{res.groundTimeHours} sa</td>
                          <td className="p-3 text-center font-mono text-[11px]">
                            {fl.isOpenStand ? (
                              <span className="text-slate-500 italic">Açık Park (Yok)</span>
                            ) : (
                              <span className="text-sky-300">
                                {res.pbbMinsUsed}dk / {res.gpuMinsUsed}dk / {res.pcaMinsUsed}dk
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-extrabold text-emerald-400">
                            {fl.isCancelled ? (
                              <span className="text-rose-400 font-bold">İptal (DX)</span>
                            ) : (
                              <>
                                {res.subtotalEUR > 0 && `${res.subtotalEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €`}
                                {res.subtotalEUR > 0 && res.subtotalTRY > 0 && ' + '}
                                {res.subtotalTRY > 0 && `${res.subtotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                              </>
                            )}
                          </td>
                        </tr>

                        {/* Note & Habits Explanation Row */}
                        {res.notes.length > 0 && (
                          <tr className="bg-slate-950/60 text-[10px]">
                            <td colSpan={10} className="px-3 py-1.5 text-slate-400 italic">
                              💡 <strong>Not:</strong> {res.notes.join(' | ')}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};
