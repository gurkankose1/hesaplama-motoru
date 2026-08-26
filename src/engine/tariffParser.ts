import type { TariffVersion } from '../types/tariff';
import { DEFAULT_TARIFF_2026 } from './defaultTariff2026';

const STORAGE_KEY = 'KOI_TARIFF_VERSIONS_V1';
const ACTIVE_KEY = 'KOI_ACTIVE_TARIFF_ID_V1';

export function getSavedTariffVersions(): TariffVersion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [DEFAULT_TARIFF_2026];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_TARIFF_2026];
    return parsed;
  } catch (e) {
    console.error('Failed to load tariff versions from localStorage', e);
    return [DEFAULT_TARIFF_2026];
  }
}

export function saveTariffVersion(newVersion: TariffVersion) {
  const versions = getSavedTariffVersions();
  const existingIdx = versions.findIndex((v) => v.id === newVersion.id);
  if (existingIdx >= 0) {
    versions[existingIdx] = newVersion;
  } else {
    versions.push(newVersion);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  setActiveTariffId(newVersion.id);
}

export function getActiveTariffId(): string {
  return localStorage.getItem(ACTIVE_KEY) || DEFAULT_TARIFF_2026.id;
}

export function setActiveTariffId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function parseJsonTariff(jsonContent: string, fileName?: string): TariffVersion {
  const data = JSON.parse(jsonContent);
  
  if (!data.landing || !data.passengerService) {
    throw new Error('Geçersiz Tarife Formatı: landing veya passengerService verisi bulunamadı.');
  }

  const newId = `custom-tariff-${Date.now()}`;
  return {
    id: newId,
    name: data.name || `Yüklenen Tarife (${fileName || 'Dosya'})`,
    effectiveDate: data.effectiveDate || new Date().toISOString().slice(0, 10),
    revision: data.revision || 'Özel Yükleme',
    sourcePdfName: fileName,
    data: data.data || data,
  };
}
