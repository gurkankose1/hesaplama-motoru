import React, { useState } from 'react';
import type { TariffVersion } from '../types/tariff';
import { getSavedTariffVersions, saveTariffVersion, parseJsonTariff } from '../engine/tariffParser';
import { X, Upload, CheckCircle2 } from 'lucide-react';

interface TariffManagerModalProps {
  activeTariff: TariffVersion;
  onClose: () => void;
  onSelectTariff: (tariff: TariffVersion) => void;
}

export const TariffManagerModal: React.FC<TariffManagerModalProps> = ({
  activeTariff,
  onClose,
  onSelectTariff,
}) => {
  const [tariffVersions, setTariffVersions] = useState<TariffVersion[]>(getSavedTariffVersions());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseJsonTariff(content, file.name);
        saveTariffVersion(parsed);
        setTariffVersions(getSavedTariffVersions());
        onSelectTariff(parsed);
        setUploadSuccess(`"${parsed.name}" başarıyla eklendi ve aktif kılındı!`);
        setUploadError(null);
      } catch (err: any) {
        setUploadError(err.message || 'Dosya okuma hatası oluştu.');
        setUploadSuccess(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              Tarife Belgesi Yükleme & Versiyon Yönetimi
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Active Tariff Status */}
          <div className="bg-indigo-950/50 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 block">Şu An Aktif Olan Tarife</span>
              <h4 className="text-sm font-extrabold text-white mt-0.5">{activeTariff.name}</h4>
              <p className="text-xs text-slate-400">Yürürlük Tarihi: {activeTariff.effectiveDate} ({activeTariff.revision})</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          </div>

          {/* Upload New File Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Yeni Tarife Belgesi Yükle (JSON / PDF Schema)
            </h4>

            <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-800/40 hover:bg-slate-800/80">
              <Upload className="w-8 h-8 text-indigo-400 mb-2" />
              <span className="text-xs font-bold text-slate-200">Tarife Dosyasını Buraya Sürükleyin veya Seçin</span>
              <span className="text-[11px] text-slate-400 mt-1">.json formatındaki yeni DHMİ ücret tablosu verisi</span>
              <input
                type="file"
                accept=".json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Status Notifications */}
          {uploadSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs font-semibold text-emerald-400">
              {uploadSuccess}
            </div>
          )}

          {uploadError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs font-semibold text-rose-400">
              {uploadError}
            </div>
          )}

          {/* Available Tariff Versions List */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Kayıtlı Tarife Versiyonları
            </h4>

            <div className="space-y-2">
              {tariffVersions.map((v) => (
                <div
                  key={v.id}
                  onClick={() => onSelectTariff(v)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    v.id === activeTariff.id
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{v.name}</div>
                    <div className="text-[10px] text-slate-400">Yürürlük: {v.effectiveDate}</div>
                  </div>

                  {v.id === activeTariff.id && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                      AKTİF
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="bg-slate-800 px-6 py-3 border-t border-slate-700 text-right">
          <button
            onClick={onClose}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-xl transition-all"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};
