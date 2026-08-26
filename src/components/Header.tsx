import React from 'react';
import type { Airport } from '../types/tariff';
import { AIRPORTS } from '../engine/defaultTariff2026';
import { Plane, Building2, DollarSign, PieChart, FileSpreadsheet, Printer, Upload } from 'lucide-react';

interface HeaderProps {
  selectedAirport: Airport;
  onSelectAirport: (airport: Airport) => void;
  exchangeRateEUR: number;
  onChangeExchangeRate: (rate: number) => void;
  activeTab: 'calculator' | 'summary';
  onChangeTab: (tab: 'calculator' | 'summary') => void;
  onOpenTariffModal: () => void;
  onExportExcel: () => void;
  onPrintSummary: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedAirport,
  onSelectAirport,
  exchangeRateEUR,
  onChangeExchangeRate,
  activeTab,
  onChangeTab,
  onOpenTariffModal,
  onExportExcel,
  onPrintSummary,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Plane className="w-6 h-6 text-white transform -rotate-45" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                DHMİ / KÖİ Ücret Hesaplama Motoru
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                  2026 Rev.01
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Ağırlıklı İstanbul Havalimanı (IST / İGA) & Tüm Havalimanları Filo Simülatörü
              </p>
            </div>
          </div>

          {/* Airport & Exchange Rate Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Airport Selector */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700/70 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
              <Building2 className="w-4 h-4 text-indigo-400 mr-2 flex-shrink-0" />
              <select
                value={selectedAirport.id}
                onChange={(e) => {
                  const found = AIRPORTS.find((a) => a.id === e.target.value);
                  if (found) onSelectAirport(found);
                }}
                className="bg-transparent text-sm text-slate-100 font-medium focus:outline-none cursor-pointer pr-2"
              >
                {AIRPORTS.map((ap) => (
                  <option key={ap.id} value={ap.id} className="bg-slate-900 text-slate-200">
                    {ap.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Manual EUR Rate Input */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700/70 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500">
              <DollarSign className="w-4 h-4 text-emerald-400 mr-1 flex-shrink-0" />
              <span className="text-xs text-slate-400 mr-2 font-medium">1 € =</span>
              <input
                type="number"
                step="0.1"
                min="1"
                value={exchangeRateEUR}
                onChange={(e) => onChangeExchangeRate(parseFloat(e.target.value) || 0)}
                className="w-16 bg-transparent text-sm font-bold text-emerald-400 focus:outline-none text-right"
              />
              <span className="text-xs text-slate-400 ml-1">TL</span>
            </div>

            {/* Tariff Manager Button */}
            <button
              onClick={onOpenTariffModal}
              title="Yeni Tarife Belgesi Yükle"
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg font-medium transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              Tarife Yükle
            </button>

            {/* Export Buttons */}
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-3 py-2 rounded-lg font-medium transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel Raporu
            </button>

            <button
              onClick={onPrintSummary}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-medium shadow-md shadow-indigo-600/20 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Yazdır / PDF
            </button>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <button
            onClick={() => onChangeTab('calculator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'calculator'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Plane className="w-4 h-4" />
            Filo & Ücret Hesaplayıcı
          </button>

          <button
            onClick={() => onChangeTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'summary'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Yönetici Özeti (Executive Summary)
          </button>
        </div>
      </div>
    </header>
  );
};
