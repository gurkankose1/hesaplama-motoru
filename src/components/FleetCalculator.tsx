import React, { useState } from 'react';
import type { Airport, FleetSummaryResult, FlightScenario } from '../types/tariff';
import { AircraftRow } from './AircraftRow';
import { Plane, Plus, X, PlusCircle } from 'lucide-react';
import { AIRCRAFT_PRESETS } from '../engine/aircraftPresets';

interface FleetCalculatorProps {
  scenarios: FlightScenario[];
  selectedAirport: Airport;
  exchangeRateEUR: number;
  fleetSummary: FleetSummaryResult;
  onUpdateScenario: (updated: FlightScenario) => void;
  onAddScenario: (presetId?: string) => void;
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
  // Modal state for adding custom aircraft to the pool
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMtow, setCustomMtow] = useState<number>(75);
  const [customSeats, setCustomSeats] = useState<number>(180);

  const handleAddCustomAircraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || customMtow <= 0) return;

    // Create a new preset entry and add scenario
    const newPresetId = `custom-${Date.now()}`;
    AIRCRAFT_PRESETS.unshift({
      id: newPresetId,
      name: customName.trim(),
      category: 'Commercial Passenger',
      defaultMtow: customMtow,
      defaultSeats: customSeats,
      isCustom: true,
    });

    onAddScenario(newPresetId);

    // Reset modal
    setCustomName('');
    setCustomMtow(75);
    setCustomSeats(180);
    setIsCustomModalOpen(false);
  };

  // Group presets by category for clean dropdown selection
  const passengerPresets = AIRCRAFT_PRESETS.filter((p) => p.category === 'Commercial Passenger' && !p.isCustom);
  const cargoPresets = AIRCRAFT_PRESETS.filter((p) => p.category === 'Commercial Cargo' && !p.isCustom);
  const privatePresets = AIRCRAFT_PRESETS.filter((p) => p.category === 'General Aviation / Private' && !p.isCustom);
  const customPresets = AIRCRAFT_PRESETS.filter((p) => p.isCustom);

  return (
    <div className="space-y-6 pb-28">
      
      {/* Fleet Calculator Header Toolbar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plane className="w-5 h-5 text-indigo-400" />
            Filo Senaryo Yönetimi & Ücret Hesaplama
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Seçili Havalimanı: <strong className="text-indigo-300">{selectedAirport.name}</strong> | KÖİ Orijinal Birimleri (EUR & TRY)
          </p>
        </div>

        {/* Quick Add Preset Dropdown & Custom Aircraft Button */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Main Preset Aircraft Selector Dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onAddScenario(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 font-bold text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-indigo-400 cursor-pointer shadow-lg shadow-indigo-950/30"
            >
              <option value="" disabled>
                📋 Hazır Uçak Havuzundan Seç... (40+ Model)
              </option>

              {customPresets.length > 0 && (
                <optgroup label="✨ Eklediğiniz Özel Uçaklar">
                  {customPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.defaultMtow}t MTOW / {p.defaultSeats} Koltuk)
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="✈️ Yolcu Uçakları (Commercial Passenger)">
                {passengerPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.defaultMtow}t / {p.defaultSeats} Koltuk)
                  </option>
                ))}
              </optgroup>

              <optgroup label="📦 Kargo Uçakları (Freighter / Cargo)">
                {cargoPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.defaultMtow}t MTOW)
                  </option>
                ))}
              </optgroup>

              <optgroup label="🛩️ Özel Jet & Genel Havacılık (Private / Business)">
                {privatePresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.defaultMtow}t MTOW)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Custom Aircraft Entry Button */}
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            + Özel Uçak & MTOW Gir
          </button>

          {/* Quick Add Buttons */}
          <button
            onClick={() => onAddScenario('a320-200')}
            className="text-xs bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-semibold transition-all"
          >
            + A320
          </button>

          <button
            onClick={() => onAddScenario('b737-800')}
            className="text-xs bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-semibold transition-all"
          >
            + B737-800
          </button>

          <button
            onClick={() => onAddScenario('b777-300er')}
            className="text-xs bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-semibold transition-all"
          >
            + B777
          </button>

          <button
            onClick={() => onAddScenario()}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Yeni Ekle
          </button>
        </div>
      </div>

      {/* Empty State vs Scenarios List */}
      {scenarios.length === 0 ? (
        <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Plane className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Henüz Hiçbir Uçak Senaryosu Eklenmedi</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              "KÖİ 2026 Ücret Tarifesi" standartlarına göre hesaplama yapmak için yukarıdaki <strong>"📋 Hazır Uçak Havuzundan Seç..."</strong> dropdown menüsünden bir model seçin veya <strong>"+ Özel Uçak & MTOW Gir"</strong> butonuna tıklayın.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onAddScenario('a320-200')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Airbus A320-200 İle Başla
            </button>

            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              ➕ Özel Uçak Tipi & MTOW Girerek Ekle
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {scenarios.map((sc, index) => {
            const res = fleetSummary.resultsByScenario[index];
            return (
              <AircraftRow
                key={sc.id}
                index={index}
                scenario={sc}
                result={res}
                exchangeRateEUR={exchangeRateEUR}
                onUpdateScenario={onUpdateScenario}
                onDuplicateScenario={onDuplicateScenario}
                onRemoveScenario={onRemoveScenario}
              />
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Total Summary Bar */}
      {scenarios.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700/90 backdrop-blur-md z-30 shadow-2xl py-3.5 px-4 sm:px-8 no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div>
                <span className="text-slate-400">Filo Toplam Uçak:</span>{' '}
                <strong className="text-white text-sm">{fleetSummary.totalAircraftCount} Uçak</strong>
                <span className="text-[10px] text-slate-500 ml-1">({fleetSummary.totalFlights} Senaryo)</span>
              </div>
              <div>
                <span className="text-slate-400">Toplam Giden Yolcu:</span>{' '}
                <strong className="text-sky-300 text-sm">{fleetSummary.totalPassengers.toLocaleString('tr-TR')} Pax</strong>
              </div>
            </div>

            {/* Orijinal Euro & TL Tutarlar */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Orijinal Tarife Toplamı (EUR & TRY)</span>
                <span className="text-base font-black text-amber-300">
                  {fleetSummary.totalSubtotalEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €
                  {fleetSummary.totalSubtotalTRY > 0 && ` + ${fleetSummary.totalSubtotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
                </span>
              </div>

              <div className="text-right border-l border-slate-700 pl-6">
                <span className="text-[10px] text-indigo-400 uppercase tracking-wider block font-bold">Çevrilmiş TL Karşılığı (1€ = {exchangeRateEUR}TL)</span>
                <span className="text-lg font-black text-emerald-400">
                  {fleetSummary.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Custom Aircraft Pool Addition Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsCustomModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Özel Uçak Tipi & MTOW Ekle</h3>
                <p className="text-xs text-slate-400">Uçak havuzuna kendi MTOW ve koltuk değerlerinizle özel uçak ekleyin.</p>
              </div>
            </div>

            <form onSubmit={handleAddCustomAircraft} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Uçak Tipi Adı / Modeli</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Boeing 737 MAX 9 veya Özel Jet..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">MTOW (Ton)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    required
                    placeholder="Örn: 88.3"
                    value={customMtow}
                    onChange={(e) => setCustomMtow(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-amber-400 font-extrabold text-right focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Koltuk Kapasitesi</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Örn: 189"
                    value={customSeats}
                    onChange={(e) => setCustomSeats(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 font-bold text-right focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                >
                  Havuza Ekle & Senaryoya Yansıt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
