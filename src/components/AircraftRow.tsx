import React, { useState } from 'react';
import type { FeeCalculationResult, FlightScenario } from '../types/tariff';
import { AIRCRAFT_PRESETS } from '../engine/aircraftPresets';
import { Copy, Trash2, ChevronDown, ChevronUp, CheckSquare, Square, Settings2, Calendar, Clock, Zap, Wind, Droplets } from 'lucide-react';

interface AircraftRowProps {
  index: number;
  scenario: FlightScenario;
  result: FeeCalculationResult;
  exchangeRateEUR: number;
  onUpdateScenario: (updated: FlightScenario) => void;
  onDuplicateScenario: (id: string, countToAdd: number) => void;
  onRemoveScenario: (id: string) => void;
}

export const AircraftRow: React.FC<AircraftRowProps> = ({
  index,
  scenario,
  result,
  onUpdateScenario,
  onDuplicateScenario,
  onRemoveScenario,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  // Select preset aircraft
  const handleSelectPreset = (presetId: string) => {
    const preset = AIRCRAFT_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.id !== 'custom') {
      onUpdateScenario({
        ...scenario,
        aircraftType: preset.name,
        mtow: preset.defaultMtow,
        seats: preset.defaultSeats,
        passengerCount: Math.round(preset.defaultSeats * 0.85), // Default 85% load factor
      });
    }
  };

  // Helper when Parking Hours changes (auto-sync Bridge Hours, GPU Mins, PCA Mins)
  const handleParkingHoursChange = (newHours: number) => {
    const hours = Math.max(0, newHours);
    const mins = Math.round(hours * 60);

    onUpdateScenario({
      ...scenario,
      parkingHours: hours,
      bridgeHours: hours, // Auto-synced with parking hours
      bridge400HzMinutes: mins, // Auto-synced (e.g. 5h = 300 mins)
      bridgePcaMinutes: mins, // Auto-synced (e.g. 5h = 300 mins)
    });
  };

  // Helper when Arrival or Departure Date-Time changes (auto-sync all durations)
  const handleDateTimeChange = (newArrival?: string, newDeparture?: string) => {
    const arrStr = newArrival !== undefined ? newArrival : (scenario.arrivalTime || '');
    const depStr = newDeparture !== undefined ? newDeparture : (scenario.departureTime || '');

    let derivedHours = scenario.parkingHours;

    if (arrStr && depStr) {
      const arrDate = new Date(arrStr);
      const depDate = new Date(depStr);

      if (!isNaN(arrDate.getTime()) && !isNaN(depDate.getTime()) && depDate > arrDate) {
        const diffMs = depDate.getTime() - arrDate.getTime();
        derivedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // round to 1 decimal place
      }
    }

    handleParkingHoursChange(derivedHours);
  };

  // Toggle single service line item checkbox
  const handleToggleService = (serviceId: string) => {
    const currentEnabled = scenario.enabledServices[serviceId] !== false;
    onUpdateScenario({
      ...scenario,
      enabledServices: {
        ...scenario.enabledServices,
        [serviceId]: !currentEnabled,
      },
    });
  };

  // Toggle all services in this scenario
  const handleToggleAllServices = (enable: boolean) => {
    const newEnabledState: Record<string, boolean> = {};
    result.lineItems.forEach((item) => {
      newEnabledState[item.id] = enable;
    });
    onUpdateScenario({
      ...scenario,
      enabledServices: newEnabledState,
    });
  };

  const categories = ['ALL', 'Konma & Konaklama', 'Yolcu Hizmetleri', 'Operasyonel & Emniyet', 'Köprü & Ekipman', 'Yer Hizmetleri'];

  const filteredLineItems = activeCategoryFilter === 'ALL'
    ? result.lineItems
    : result.lineItems.filter((item) => item.category === activeCategoryFilter);

  // Formatting date-time helper for badge display
  const formatDateTimeDisplay = (isoStr?: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden mb-6 transition-all">
      {/* Header bar of aircraft card */}
      <div className="bg-slate-800 px-5 py-4 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
        
        {/* Scenario Title & Aircraft Type Select */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm">
            #{index + 1}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Uçak Senaryosu
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                scenario.flightCategory === 'INTERNATIONAL' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {scenario.flightCategory === 'INTERNATIONAL' ? 'Dış Hat' : 'İç Hat'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <select
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 font-bold text-base rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Şablon Seçin --</option>
                {AIRCRAFT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.defaultMtow}t / {p.defaultSeats} koltuk)
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={scenario.aircraftType}
                onChange={(e) => onUpdateScenario({ ...scenario, aircraftType: e.target.value })}
                placeholder="Uçak Tipi Adı"
                className="bg-slate-900 border border-slate-700 text-slate-200 text-sm font-semibold rounded-lg px-3 py-1 focus:outline-none focus:border-indigo-500 w-44"
              />
            </div>
          </div>
        </div>

        {/* Quantity multiplier & Action buttons */}
        <div className="flex items-center gap-3">
          {/* Aircraft Quantity Multiplier */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1">
            <span className="text-xs text-slate-400 font-medium mr-2">Uçak Adedi:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={scenario.quantity}
              onChange={(e) => onUpdateScenario({ ...scenario, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-12 bg-transparent text-sm font-bold text-amber-400 text-center focus:outline-none"
            />
            <span className="text-xs text-amber-400 font-semibold ml-1">x</span>
          </div>

          {/* Quick Add 5 More Button */}
          <button
            onClick={() => onDuplicateScenario(scenario.id, 5)}
            title="Bundan 5 Adet Daha Ekle"
            className="flex items-center gap-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-2.5 py-1.5 rounded-lg font-medium transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            +5 Ekle
          </button>

          {/* Duplicate 1 Button */}
          <button
            onClick={() => onDuplicateScenario(scenario.id, 1)}
            title="Aynısından 1 Adet Kopyala"
            className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg font-medium transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            Kopyala
          </button>

          {/* Delete Scenario */}
          <button
            onClick={() => onRemoveScenario(scenario.id)}
            title="Bu Senaryoyu Sil"
            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Expand / Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Scenario Cost Summary Banner */}
      <div className="bg-slate-900/60 px-5 py-3 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-300">
          <div>
            <span className="text-slate-500">MTOW:</span> <strong className="text-slate-200">{scenario.mtow} Ton</strong>
          </div>
          <div>
            <span className="text-slate-500">Koltuk / Yolcu:</span> <strong className="text-slate-200">{scenario.seats} Koltuk / {scenario.passengerCount} Pax</strong>
          </div>
          <div>
            <span className="text-slate-500">Park Süresi:</span> <strong className="text-amber-400">{scenario.parkingHours} Saat</strong>
            {scenario.arrivalTime && scenario.departureTime && (
              <span className="text-slate-400 text-[10px] ml-1">
                ({formatDateTimeDisplay(scenario.arrivalTime)} → {formatDateTimeDisplay(scenario.departureTime)})
              </span>
            )}
          </div>
        </div>

        {/* Live Calculation Totals Badge */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Uçak Başı Tutar</span>
            <span className="text-sm font-semibold text-slate-200">
              {result.perAircraftEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €
              {result.perAircraftTRY > 0 && ` + ${result.perAircraftTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
            </span>
          </div>

          <div className="text-right border-l border-slate-700 pl-4">
            <span className="text-[10px] text-indigo-400 uppercase tracking-wider block font-bold">
              Filo Toplam ({scenario.quantity} Uçak)
            </span>
            <span className="text-base font-bold text-emerald-400">
              {result.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Parameters & Service Checkboxes Form */}
      {isExpanded && (
        <div className="p-5 space-y-6">
          
          {/* Section 1: Date/Time Picker & Parameter Inputs Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Uçuş Tarih / Saat & Park Süresi Belirleme
            </h3>

            {/* Date-Time Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-xs">
              
              {/* Arrival Date-Time Picker */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  İniş Tarihi ve Saati (Arrival)
                </label>
                <input
                  type="datetime-local"
                  value={scenario.arrivalTime || ''}
                  onChange={(e) => handleDateTimeChange(e.target.value, undefined)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 font-semibold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Departure Date-Time Picker */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  Kalkış Tarihi ve Saati (Departure)
                </label>
                <input
                  type="datetime-local"
                  value={scenario.departureTime || ''}
                  onChange={(e) => handleDateTimeChange(undefined, e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 font-semibold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Total Derived Parking Hours / Manual Input */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center justify-between">
                  <span>Hesaplanan Park Süresi</span>
                  <span className="text-[10px] text-indigo-400 font-normal">Süreler Otomatik Eşitlenir</span>
                </label>
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={scenario.parkingHours}
                    onChange={(e) => handleParkingHoursChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-amber-400 font-bold text-sm text-right focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-semibold ml-2">Saat</span>
                </div>
              </div>

            </div>

            {/* General Flight Parameters Grid */}
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              Genel Operasyon Parametreleri & KÖİ Çarpanları
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              
              {/* Flight Category */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Uçuş Tipi</label>
                <select
                  value={scenario.flightCategory}
                  onChange={(e) => onUpdateScenario({ ...scenario, flightCategory: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-semibold focus:border-indigo-500 focus:outline-none"
                >
                  <option value="INTERNATIONAL">Dış Hat (International)</option>
                  <option value="DOMESTIC">İç Hat (Domestic)</option>
                </select>
              </div>

              {/* MTOW Input */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">MTOW (Ton)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={scenario.mtow}
                  onChange={(e) => onUpdateScenario({ ...scenario, mtow: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold text-right focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Seats Input */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Koltuk Kapasitesi</label>
                <input
                  type="number"
                  min="0"
                  value={scenario.seats}
                  onChange={(e) => onUpdateScenario({ ...scenario, seats: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold text-right focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Passenger Count */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Giden Yolcu (Pax)</label>
                <input
                  type="number"
                  min="0"
                  value={scenario.passengerCount}
                  onChange={(e) => onUpdateScenario({ ...scenario, passengerCount: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-indigo-300 font-bold text-right focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Köprü Adedi (1, 2, 3 Köprü - Madde 3.k) */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                  <span>Köprü Adedi (PBB)</span>
                </label>
                <select
                  value={scenario.bridgeCount || 1}
                  onChange={(e) => onUpdateScenario({ ...scenario, bridgeCount: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:border-indigo-500 focus:outline-none"
                >
                  <option value={1}>1 Köprü (Standart 1.0x)</option>
                  <option value={2}>2 Köprü (+%20 İlave 1.2x)</option>
                  <option value={3}>3 Köprü (+%40 İlave 1.4x)</option>
                </select>
              </div>

              {/* Su Hizmeti Servis Adedi (Water Refills) */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1 text-sky-300">
                  <Droplets className="w-3.5 h-3.5" />
                  Su İkmal Adedi
                </label>
                <select
                  value={scenario.waterServiceCount || 1}
                  onChange={(e) => onUpdateScenario({ ...scenario, waterServiceCount: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sky-300 font-bold focus:border-indigo-500 focus:outline-none"
                >
                  <option value={1}>1 İkmal / Servis</option>
                  <option value={2}>2 İkmal / Servis</option>
                  <option value={3}>3 İkmal / Servis</option>
                  <option value={4}>4 İkmal / Servis</option>
                </select>
              </div>

            </div>

            {/* Advanced Equipment Cable / Duct Multipliers Grid & Duration Overrides */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-3 text-xs">
              
              {/* GPU Kablo Sayısı (Madde 3.f) */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1 text-sky-300">
                  <Zap className="w-3.5 h-3.5" />
                  GPU Kablo Sayısı
                </label>
                <select
                  value={scenario.gpuCableCount || 1}
                  onChange={(e) => onUpdateScenario({ ...scenario, gpuCableCount: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sky-300 font-bold focus:border-indigo-500 focus:outline-none"
                >
                  <option value={1}>1 Kablo (Standart 1.0x)</option>
                  <option value={2}>2 Kablo (+%50 Zam 1.5x)</option>
                  <option value={3}>3 Kablo (+%100 Zam 2.0x)</option>
                  <option value={4}>4 Kablo (+%150 Zam 2.5x)</option>
                </select>
              </div>

              {/* GPU / 400Hz Minutes (Manuel değiştirilebilir) */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium text-sky-300">GPU (400Hz) Dk</label>
                <input
                  type="number"
                  min="0"
                  value={scenario.bridge400HzMinutes}
                  onChange={(e) => onUpdateScenario({ ...scenario, bridge400HzMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sky-300 font-bold text-right focus:border-indigo-500 focus:outline-none"
                  title="Manuel olarak değiştirebilirsiniz"
                />
              </div>

              {/* PCA Kanal Sayısı (Madde 3.f) */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1 text-indigo-300">
                  <Wind className="w-3.5 h-3.5" />
                  PCA Kanal Sayısı
                </label>
                <select
                  value={scenario.pcaDuctCount || 1}
                  onChange={(e) => onUpdateScenario({ ...scenario, pcaDuctCount: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-indigo-300 font-bold focus:border-indigo-500 focus:outline-none"
                >
                  <option value={1}>1 Kanal (Standart 1.0x)</option>
                  <option value={2}>2 Kanal (+%50 Zam 1.5x)</option>
                  <option value={3}>3 Kanal (+%100 Zam 2.0x)</option>
                  <option value={4}>4 Kanal (+%150 Zam 2.5x)</option>
                </select>
              </div>

              {/* PCA Ventilation Minutes (Manuel değiştirilebilir) */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium text-indigo-300">PCA Havalandırma Dk</label>
                <input
                  type="number"
                  min="0"
                  value={scenario.bridgePcaMinutes}
                  onChange={(e) => onUpdateScenario({ ...scenario, bridgePcaMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-indigo-300 font-bold text-right focus:border-indigo-500 focus:outline-none"
                  title="Manuel olarak değiştirebilirsiniz"
                />
              </div>

              {/* Yatı Uçağı (Overnight Stay Surcharges) */}
              <label className="flex items-center gap-2 bg-slate-900/80 border border-amber-500/40 rounded-lg p-2.5 cursor-pointer hover:border-amber-500 col-span-2">
                <input
                  type="checkbox"
                  checked={scenario.isOvernightStay}
                  onChange={(e) => onUpdateScenario({ ...scenario, isOvernightStay: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-amber-500"
                />
                <div>
                  <span className="text-amber-300 font-bold block">Yatı Uçağı / Geceleme</span>
                  <span className="text-[10px] text-slate-400 block">2.gün %200, 3.gün %300, 3+gün %500 zam (Madde 3.d)</span>
                </div>
              </label>

            </div>

            {/* Operational Checkboxes & Additional Utilities */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-3 text-xs">
              
              {/* Night Landing */}
              <label className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-lg p-2.5 cursor-pointer hover:border-slate-600">
                <input
                  type="checkbox"
                  checked={scenario.nightLanding}
                  onChange={(e) => onUpdateScenario({ ...scenario, nightLanding: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
                />
                <span className="text-slate-300 font-medium">Gece İniş Aydınlatma</span>
              </label>

              {/* Night Takeoff */}
              <label className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-lg p-2.5 cursor-pointer hover:border-slate-600">
                <input
                  type="checkbox"
                  checked={scenario.nightTakeoff}
                  onChange={(e) => onUpdateScenario({ ...scenario, nightTakeoff: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
                />
                <span className="text-slate-300 font-medium">Gece Kalkış Aydınlatma</span>
              </label>

              {/* Technical Landing */}
              <label className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-lg p-2.5 cursor-pointer hover:border-slate-600">
                <input
                  type="checkbox"
                  checked={scenario.isTechnicalLanding}
                  onChange={(e) => onUpdateScenario({ ...scenario, isTechnicalLanding: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
                />
                <span className="text-slate-300 font-medium">Teknik İniş (%50 İndirim)</span>
              </label>

              {/* Körük Zorunlu Yatı Kalma (%50 indirim) */}
              <label className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-lg p-2.5 cursor-pointer hover:border-slate-600">
                <input
                  type="checkbox"
                  checked={scenario.isBridgeOvernightStay}
                  onChange={(e) => onUpdateScenario({ ...scenario, isBridgeOvernightStay: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
                />
                <span className="text-slate-300 font-medium">Körükte Zorunlu Yatı (%50 İndirim)</span>
              </label>

              {/* Follow-Me Ops Count */}
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-2">
                <span className="block text-slate-400 text-[10px]">Follow-Me Adedi</span>
                <input
                  type="number"
                  min="0"
                  value={scenario.followMeCount}
                  onChange={(e) => onUpdateScenario({ ...scenario, followMeCount: parseInt(e.target.value) || 0 })}
                  className="w-full bg-transparent text-slate-100 font-bold focus:outline-none text-right"
                />
              </div>

              {/* ARFF Hours */}
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-2">
                <span className="block text-slate-400 text-[10px]">ARFF İtfaiye (Saat)</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={scenario.arffHours}
                  onChange={(e) => onUpdateScenario({ ...scenario, arffHours: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-slate-100 font-bold focus:outline-none text-right"
                />
              </div>

            </div>
          </div>

          {/* Section 2: Service Itemized Checkboxes Table */}
          <div className="pt-4 border-t border-slate-700/80">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                Hizmet Kalemleri Seçim & Opsiyon Kutuları (Itemized Services Checkbox)
              </h3>

              {/* Quick Select All / Unselect All */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleAllServices(true)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md font-medium transition-all"
                >
                  Tümünü Seç (Check All)
                </button>
                <button
                  onClick={() => handleToggleAllServices(false)}
                  className="text-[11px] text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-md font-medium transition-all"
                >
                  Tümünü Kaldır (Uncheck All)
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                    activeCategoryFilter === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'Tümü' : cat}
                </button>
              ))}
            </div>

            {/* Service Checkbox Items Table */}
            <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-900/80">
              <div className="divide-y divide-slate-800/80">
                {filteredLineItems.map((item) => {
                  const isChecked = item.enabled;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleService(item.id)}
                      className={`p-3 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                        isChecked ? 'bg-slate-900/90 hover:bg-slate-800/90' : 'bg-slate-950/50 opacity-60 hover:opacity-80'
                      }`}
                    >
                      {/* Left: Checkbox + Name + Description */}
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-indigo-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-600" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${isChecked ? 'text-slate-100' : 'text-slate-500 line-through'}`}>
                              {item.name}
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                        </div>
                      </div>

                      {/* Right: Price & Subtotal */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-bold text-slate-200">
                          {item.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.currency}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Filo x{scenario.quantity}: {(item.total * scenario.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.currency}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
