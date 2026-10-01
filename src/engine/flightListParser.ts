import * as XLSX from 'xlsx';
import type { FlightRecord } from '../types/flightList';

export function parseDateTime(val: any): number | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel date serial number
    return (val - 25569) * 86400 * 1000;
  }
  const str = String(val).trim();
  if (!str) return null;

  // DD.MM.YYYY HH:mm or DD.MM.YYYY HH:mm:ss
  const trMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (trMatch) {
    const d = parseInt(trMatch[1], 10);
    const m = parseInt(trMatch[2], 10) - 1;
    const y = parseInt(trMatch[3], 10);
    const hh = parseInt(trMatch[4], 10);
    const mm = parseInt(trMatch[5], 10);
    const ss = trMatch[6] ? parseInt(trMatch[6], 10) : 0;
    return new Date(y, m, d, hh, mm, ss).getTime();
  }

  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? null : parsed;
}

export function cleanDigits(val: any): string {
  if (!val) return '';
  return String(val).replace(/\D+/g, '').replace(/^0+/, '');
}

export function parseIhkFlightReport(arrayBuffer: ArrayBuffer): FlightRecord[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length < 2) return [];

  const records: FlightRecord[] = [];
  const regEvents: Record<string, { landingMs: number | null; takeoffMs: number | null; onBlockMs: number | null; offBlockMs: number | null; rowIdx: number }[]> = {};

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    const airline = String(r[0] || 'UNKNOWN').trim();
    const arrFlightNo = String(r[2] || '').trim();
    const depFlightNo = String(r[21] || '').trim();
    const regNo = String(r[3] || r[22] || '').trim().toUpperCase();
    const acType = String(r[4] || r[24] || 'A320').trim();
    const acCategory = String(r[6] || 'C').trim();
    
    // Status (DX = Cancelled)
    const status = String(r[14] || r[37] || '').trim();
    const isCancelled = status.toUpperCase() === 'DX' || status.toUpperCase().includes('CANCEL');

    // Flight Category (I = International, D = Domestic). Prefer Dep I/D (col 34)
    const depId = String(r[34] || '').trim().toUpperCase();
    const arrId = String(r[11] || '').trim().toUpperCase();
    const rawCategory = depId || arrId || 'I';
    const flightCategory = rawCategory.startsWith('D') ? 'DOMESTIC' : 'INTERNATIONAL';

    // MTOW (in Kg -> convert to metric Ton)
    const rawMtowKg = parseFloat(r[53]) || 79000;
    const mtowTon = Math.round((rawMtowKg / 1000) * 10) / 10;

    // Stands & Stand Areas
    const arrStandArea = String(r[17] || '').trim();
    const depStandArea = String(r[39] || '').trim();
    const standArea = depStandArea || arrStandArea || 'APRON 1';

    const arrStand = String(r[18] || '').trim();
    const depStand = String(r[40] || '').trim();
    const stand = depStand || arrStand || '101';

    // Stand Classification
    const saUpper = (standArea + ' ' + stand).toUpperCase();
    const isOpenStand = saUpper.includes('APRON') || saUpper.includes('CARGO') || saUpper.includes('DEICING') || saUpper.includes('AÇIK');
    const isBridgeStand = !isOpenStand;

    // Timings
    const sta = r[7] ? String(r[7]) : undefined;
    const std = r[25] ? String(r[25]) : undefined;
    const ata = r[9] ? String(r[9]) : undefined;
    let atd = r[33] ? String(r[33]) : undefined;
    let onBlock = r[10] ? String(r[10]) : undefined;
    let offBlock = r[31] ? String(r[31]) : (r[32] ? String(r[32]) : undefined);

    const landingMs = parseDateTime(ata) || parseDateTime(sta);
    const takeoffMs = parseDateTime(atd) || parseDateTime(std);
    const onBlockMs = parseDateTime(onBlock);
    const offBlockMs = parseDateTime(offBlock);

    if (regNo) {
      if (!regEvents[regNo]) regEvents[regNo] = [];
      regEvents[regNo].push({ landingMs, takeoffMs, onBlockMs, offBlockMs, rowIdx: records.length });
    }

    // Passengers & Towing
    const arrPax = parseInt(r[16]) || 0;
    const depPax = parseInt(r[48]) || 0;
    const towCount = parseInt(r[60]) || 0;

    records.push({
      id: `fl-${i}-${Date.now()}`,
      airline,
      arrFlightNo,
      depFlightNo,
      regNo,
      aircraftType: acType,
      aircraftCategory: acCategory,
      mtowKg: rawMtowKg,
      mtowTon,
      flightCategory,
      status,
      isCancelled,
      sta,
      std,
      ata,
      atd,
      onBlock,
      offBlock,
      standArea,
      stand,
      isBridgeStand,
      isOpenStand,
      arrPax,
      depPax,
      towCount,
      rawRow: r,
    });
  }

  // Second pass: Link missing departure/offBlock timestamps by RegNo turnaround
  records.forEach((rec) => {
    const regNo = rec.regNo;
    const currentLandingMs = parseDateTime(rec.ata) || parseDateTime(rec.sta);
    const currentTakeoffMs = parseDateTime(rec.atd) || parseDateTime(rec.std);
    const currentOnBlockMs = parseDateTime(rec.onBlock);
    const currentOffBlockMs = parseDateTime(rec.offBlock);

    if (regNo && regEvents[regNo]) {
      // Link Ground Time takeoff timestamp if missing on single-leg arrival row
      if (currentLandingMs && !currentTakeoffMs) {
        const nextEv = regEvents[regNo].find(e => e.takeoffMs && e.takeoffMs > currentLandingMs);
        if (nextEv && nextEv.takeoffMs) {
          rec.atd = new Date(nextEv.takeoffMs).toISOString();
        }
      }
      // Link Parking offBlock timestamp if missing on single-leg arrival row
      if (currentOnBlockMs && !currentOffBlockMs) {
        const nextEv = regEvents[regNo].find(e => e.offBlockMs && e.offBlockMs > currentOnBlockMs);
        if (nextEv && nextEv.offBlockMs) {
          rec.offBlock = new Date(nextEv.offBlockMs).toISOString();
        }
      }
    }
  });

  return records;
}

/**
 * Parses actual usage Excel files (GPU, PCA, PBB, WATER)
 * Returns a dictionary mapping flight identifiers to usage values (mins or count)
 */
export function parseUsageExcel(arrayBuffer: ArrayBuffer): Record<string, number> {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const usageMap: Record<string, number> = {};

  if (rows.length < 2) return usageMap;

  // Detect header row index
  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const rowStr = (rows[i] || []).join(' ').toUpperCase();
    if (rowStr.includes('FLIGHT') || rowStr.includes('TOTAL_USAGE') || rowStr.includes('USAGE')) {
      headerIndex = i;
      break;
    }
  }

  const headers = rows[headerIndex] || [];
  const findCol = (keywords: string[]): number => {
    return headers.findIndex((h: any) => {
      const s = String(h || '').toUpperCase();
      return keywords.some(k => s.includes(k.toUpperCase()));
    });
  };

  const arrFlightCol = findCol(['Flight No', 'ARR FLIGHT']);
  const depFlightCol = findCol(['DEP FLIGHT NO', 'DEP FLIGHT']);
  const iataArrCol = findCol(['Airline IATA']);
  const iataDepCol = findCol(['Dep Airline']);
  const icaoArrCol = findCol(['Airline ICAO']);
  const standCol = findCol(['Departure Stand', 'Stand']);
  const usageCol = findCol(['TOTAL_USAGE', 'USAGE']);

  const cleanNo = (val: any): string => {
    if (!val) return '';
    return String(val).trim().toUpperCase().replace(/^0+/, '');
  };

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    const iataArr = cleanNo(r[iataArrCol >= 0 ? iataArrCol : 4]);
    const iataDep = cleanNo(r[iataDepCol >= 0 ? iataDepCol : 12]);
    const icaoArr = cleanNo(r[icaoArrCol >= 0 ? icaoArrCol : 3]);
    const arrRaw = cleanNo(r[arrFlightCol >= 0 ? arrFlightCol : 5]);
    const depRaw = cleanNo(r[depFlightCol >= 0 ? depFlightCol : 13]);
    const standVal = cleanNo(r[standCol >= 0 ? standCol : 15]);
    const rawUsage = parseFloat(r[usageCol >= 0 ? usageCol : 17]);
    const usage = isNaN(rawUsage) ? 0 : rawUsage;

    const arrDig = cleanDigits(arrRaw);
    const depDig = cleanDigits(depRaw);

    // Single keys
    if (arrRaw) usageMap[arrRaw] = usage;
    if (depRaw) usageMap[depRaw] = usage;
    if (arrDig) usageMap[arrDig] = usage;
    if (depDig) usageMap[depDig] = usage;

    // Concatenated IATA / ICAO + Flight Number keys (e.g., A3 + 0434 -> A30434, A3 + 434 -> A3434)
    if (iataArr && arrRaw) usageMap[`${iataArr}${arrRaw}`] = usage;
    if (iataArr && arrDig) usageMap[`${iataArr}${arrDig}`] = usage;
    if (icaoArr && arrRaw) usageMap[`${icaoArr}${arrRaw}`] = usage;
    if (icaoArr && arrDig) usageMap[`${icaoArr}${arrDig}`] = usage;

    if (iataDep && depRaw) usageMap[`${iataDep}${depRaw}`] = usage;
    if (iataDep && depDig) usageMap[`${iataDep}${depDig}`] = usage;

    // Stand + Flight keys
    if (standVal && arrRaw) usageMap[`${standVal}_${arrRaw}`] = usage;
    if (standVal && arrDig) usageMap[`${standVal}_${arrDig}`] = usage;
    if (standVal && depRaw) usageMap[`${standVal}_${depRaw}`] = usage;
    if (standVal && depDig) usageMap[`${standVal}_${depDig}`] = usage;
  }

  return usageMap;
}
