import * as XLSX from 'xlsx';
import type { FlightRecord } from '../types/flightList';

export function parseIhkFlightReport(arrayBuffer: ArrayBuffer): FlightRecord[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length < 2) return [];

  const records: FlightRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    const airline = String(r[0] || 'UNKNOWN').trim();
    const arrFlightNo = String(r[2] || '').trim();
    const depFlightNo = String(r[21] || '').trim();
    const regNo = String(r[3] || r[22] || '').trim();
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
    const atd = r[33] ? String(r[33]) : undefined;
    const onBlock = r[10] ? String(r[10]) : undefined;
    const offBlock = r[30] ? String(r[30]) : undefined;

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

  return records;
}
