import React from 'react';
import type { Airport, FleetSummaryResult, FlightScenario } from '../types/tariff';
import { AircraftRow } from './AircraftRow';
import { Plus, Plane, Building2 } from 'lucide-react';

interface FleetCalculatorProps {
  scenarios: FlightScenario[];
  selectedAirport: Airport;
  exchangeRateEUR: number;
  fleetSummary: FleetSummaryResult;
  onUpdateScenario: (updated: FlightScenario) => void;
  onAddScenario: (presetType?: string) => void;
  onDuplicateScenario: (id: string, countToAdd: number) => void;
  onRemoveScenario: (id: string) => void;
}

export const FleetCalculator: React.FC<FleetCalculatorProps> = ({
  scenarios,
  selectedAirport,
  exchangeRateEUR,
  fleetSummary,
  onUpdateScenario,
  onAddScenario,
  onDuplicateScenario,
  onRemoveScenario,
}) => {
  return (
    <div className="space-y-6 pb-24">
      
      {/* Top Banner / Fleet Simulator Action Bar */}
      <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plane className="w-5 h-5 text-indigo-400" />
            Filo & Çoklu Uçuş Senaryo Hesaplayıcısı
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Uçak tipinizi seçin, almak istediğiniz hizmet kalemlerini işaretleyin ve karma filolar için toplam tutarları anında hesaplayın.
          </p>
        </div>

        {/* Quick Add Aircraft Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onAddScenario('a320-200')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-medium transition-all"
          >
            + A320 Ekle
          </button>
          <button
            onClick={() => onAddScenario('b737-800')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-medium transition-all"
          >
            + B737-800 Ekle
          </button>
          <button
            onClick={() => onAddScenario('b777-300er')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-medium transition-all"
          >
            + B777-300ER Ekle
          </button>

          <button
            onClick={() => onAddScenario()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Yeni Uçak / Senaryo Ekle
          </button>
        </div>
      </div>

      {/* Empty State View if 0 scenarios */}
      {scenarios.length === 0 ? (
        <div className="bg-slate-800/40 border-2 border-dashed border-slate-700 rounded-3xl p-12 text-center space-y-4 my-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
            <Plane className="w-8 h-8 transform -rotate-45" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Henüz Hiçbir Uçak Seçilmedi</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Hesaplama yapmaya başlamak için yukarıdaki hızlı uçak ekleme butonlarını kullanabilir veya yeni bir uçak senaryosu oluşturabilirsiniz. Hizmet kalemleri varsayılan olarak kapalı gelecektir.
            </p>
          </div>
          <button
            onClick={() => onAddScenario()}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            İlk Uçağı Ekle
          </button>
        </div>
      ) : (
        /* Scenarios List */
        scenarios.map((sc, idx) => (
          <AircraftRow
            key={sc.id}
            index={idx}
            scenario={sc}
            result={fleetSummary.resultsByScenario[idx]}
            exchangeRateEUR={exchangeRateEUR}
            onUpdateScenario={onUpdateScenario}
            onDuplicateScenario={onDuplicateScenario}
            onRemoveScenario={onRemoveScenario}
          />
        ))
      )}

      {/* Add New Scenario Card Trigger */}
      {scenarios.length > 0 && (
        <div
          onClick={() => onAddScenario()}
          className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 bg-slate-800/30 hover:bg-slate-800/60 rounded-2xl p-6 text-center cursor-pointer transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-slate-800 text-indigo-400 group-hover:scale-110 flex items-center justify-center mx-auto mb-2 transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">Yeni Uçak Tipi veya Senaryo Ekle</h3>
          <p className="text-xs text-slate-400 mt-1">Farklı varyasyonlarda toplu uçak hesaplamak için yeni bir senaryo satırı oluşturun</p>
        </div>
      )}

      {/* Sticky Bottom Fleet Live Totals Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md shadow-2xl no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Seçili Havalimanı</span>
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {selectedAirport.name}
              </span>
            </div>

            <div className="border-l border-slate-800 pl-6">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Filo Uçak Sayısı</span>
              <span className="text-sm font-bold text-slate-100">{fleetSummary.totalAircraftCount} Uçak ({fleetSummary.totalFlights} Senaryo)</span>
            </div>

            <div className="border-l border-slate-800 pl-6 hidden md:block">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Toplam Yolcu</span>
              <span className="text-sm font-bold text-slate-100">{fleetSummary.totalPassengers.toLocaleString('tr-TR')} Pax</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Subtotal EUR & TRY */}
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Orijinal Tarife Toplamı</span>
              <span className="text-sm font-bold text-slate-200">
                {fleetSummary.totalSubtotalEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €
                {fleetSummary.totalSubtotalTRY > 0 && ` + ${fleetSummary.totalSubtotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
              </span>
            </div>

            {/* Total Converted TL */}
            <div className="bg-indigo-600/20 border border-indigo-500/40 rounded-xl px-4 py-1.5 text-right shadow-lg shadow-indigo-500/10">
              <span className="text-[10px] text-indigo-300 uppercase tracking-wider block font-bold">
                TOPLAM TL KARŞILIĞI (1 € = {exchangeRateEUR} TL)
              </span>
              <span className="text-lg font-extrabold text-emerald-400">
                {fleetSummary.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
