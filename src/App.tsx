import { useState, useMemo } from 'react';
import type { Airport, FlightScenario, TariffVersion } from './types/tariff';
import { AIRPORTS, DEFAULT_TARIFF_2026 } from './engine/defaultTariff2026';
import { AIRCRAFT_PRESETS } from './engine/aircraftPresets';
import { calculateFleetSummary } from './engine/calculatorEngine';
import { exportFleetToExcel } from './engine/excelExporter';
import { Header } from './components/Header';
import { FleetCalculator } from './components/FleetCalculator';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { AiAssistantTab } from './components/AiAssistantTab';
import { TariffManagerModal } from './components/TariffManagerModal';

export function App() {
  // Active Airport (Default: IST / İGA Istanbul Airport)
  const [selectedAirport, setSelectedAirport] = useState<Airport>(AIRPORTS[0]);
  
  // Manual Exchange Rate (Default: 40.50 TL / EUR)
  const [exchangeRateEUR, setExchangeRateEUR] = useState<number>(40.50);

  // Active Tariff Version
  const [activeTariff, setActiveTariff] = useState<TariffVersion>(DEFAULT_TARIFF_2026);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);

  // Active UI Tab
  const [activeTab, setActiveTab] = useState<'calculator' | 'summary' | 'ai'>('calculator');

  // Initial Default Scenarios (Empty array per user request!)
  const [scenarios, setScenarios] = useState<FlightScenario[]>([]);

  // Recalculate fleet summary whenever scenarios, airport, or rate change
  const fleetSummary = useMemo(() => {
    return calculateFleetSummary(scenarios, selectedAirport, exchangeRateEUR, activeTariff);
  }, [scenarios, selectedAirport, exchangeRateEUR, activeTariff]);

  // Handler: Update single scenario
  const handleUpdateScenario = (updated: FlightScenario) => {
    setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  // Handler: Add new scenario (Default 2 Hours set by default!)
  const handleAddScenario = (presetId?: string) => {
    const preset = AIRCRAFT_PRESETS.find((p) => p.id === (presetId || 'a320-200')) || AIRCRAFT_PRESETS[0];
    const n = new Date();
    const arrTime = new Date(n.getTime() + 1 * 3600000).toISOString().slice(0, 16);
    const depTime = new Date(n.getTime() + 3 * 3600000).toISOString().slice(0, 16); // 2 hours window

    const newScenario: FlightScenario = {
      id: `sc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${preset.name} Senaryosu`,
      aircraftType: preset.name,
      mtow: preset.defaultMtow,
      seats: preset.defaultSeats,
      passengerCount: Math.round(preset.defaultSeats * 0.80),
      petcCount: 0,
      avihCount: 0,
      flightCategory: 'INTERNATIONAL',
      arrivalTime: arrTime,
      departureTime: depTime,
      parkingHours: 2, // Default 2 hours set!
      isOvernightStay: false,
      isBridgeOvernightStay: false,
      nightLanding: false,
      nightTakeoff: false,
      isTechnicalLanding: false,
      isSeasonalDiscountApplicable: false,
      arffHours: 0,
      followMeCount: 1,
      airportExtensionHours: 0,
      bridgeHours: 2, // Default 2 hours
      bridgeCount: 1,
      bridge400HzMinutes: 120, // 2 * 60 = 120 mins
      gpuCableCount: 1,
      bridgePcaMinutes: 120, // 2 * 60 = 120 mins
      pcaDuctCount: 1,
      waterServiceCount: 1,
      bridgeWaterUse: false,
      bridgeVdgsUse: false,
      quantity: 1,
      enabledServices: {}, // All checkboxes unchecked by default!
    };
    setScenarios((prev) => [...prev, newScenario]);
  };

  // Handler: Duplicate existing scenario
  const handleDuplicateScenario = (id: string, countToAdd: number) => {
    setScenarios((prev) => {
      const target = prev.find((s) => s.id === id);
      if (!target) return prev;
      if (countToAdd > 1) {
        return prev.map((s) => (s.id === id ? { ...s, quantity: s.quantity + countToAdd } : s));
      } else {
        const clone: FlightScenario = {
          ...target,
          id: `sc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          quantity: 1,
        };
        return [...prev, clone];
      }
    });
  };

  // Handler: Remove scenario
  const handleRemoveScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  // Export Excel
  const handleExportExcel = () => {
    if (scenarios.length === 0) {
      alert('Rapor indirmek için lütfen en az 1 uçak senaryosu ekleyin.');
      return;
    }
    exportFleetToExcel(fleetSummary, scenarios);
  };

  // Print Summary
  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <Header
        selectedAirport={selectedAirport}
        onSelectAirport={setSelectedAirport}
        exchangeRateEUR={exchangeRateEUR}
        onChangeExchangeRate={setExchangeRateEUR}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenTariffModal={() => setIsTariffModalOpen(true)}
        onExportExcel={handleExportExcel}
        onPrintSummary={handlePrintSummary}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'calculator' && (
          <FleetCalculator
            scenarios={scenarios}
            selectedAirport={selectedAirport}
            exchangeRateEUR={exchangeRateEUR}
            fleetSummary={fleetSummary}
            onUpdateScenario={handleUpdateScenario}
            onAddScenario={handleAddScenario}
            onDuplicateScenario={handleDuplicateScenario}
            onRemoveScenario={handleRemoveScenario}
          />
        )}

        {activeTab === 'summary' && (
          <ExecutiveSummary
            fleetSummary={fleetSummary}
            scenarios={scenarios}
            exchangeRateEUR={exchangeRateEUR}
            onPrint={handlePrintSummary}
            onExportExcel={handleExportExcel}
          />
        )}

        {activeTab === 'ai' && (
          <AiAssistantTab
            fleetSummary={fleetSummary}
            scenarios={scenarios}
            exchangeRateEUR={exchangeRateEUR}
          />
        )}
      </main>

      {/* Tariff Version Manager Modal */}
      {isTariffModalOpen && (
        <TariffManagerModal
          activeTariff={activeTariff}
          onClose={() => setIsTariffModalOpen(false)}
          onSelectTariff={(tariff) => {
            setActiveTariff(tariff);
            setIsTariffModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
