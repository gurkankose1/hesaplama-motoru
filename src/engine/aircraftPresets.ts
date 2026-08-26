import type { AircraftPreset } from '../types/tariff';

export const AIRCRAFT_PRESETS: AircraftPreset[] = [
  // Commercial Passenger - Airbus
  { id: 'a320-200', name: 'Airbus A320-100/200 (A320)', category: 'Commercial Passenger', defaultMtow: 79, defaultSeats: 180 },
  { id: 'a320neo', name: 'Airbus A320neo (A20N)', category: 'Commercial Passenger', defaultMtow: 79, defaultSeats: 186 },
  { id: 'a321-200', name: 'Airbus A321 (A321)', category: 'Commercial Passenger', defaultMtow: 97, defaultSeats: 220 },
  { id: 'a321neo', name: 'Airbus A321neo (A21N)', category: 'Commercial Passenger', defaultMtow: 97, defaultSeats: 240 },
  { id: 'a330-200', name: 'Airbus A330-200 (A332)', category: 'Commercial Passenger', defaultMtow: 242, defaultSeats: 290 },
  { id: 'a330-300', name: 'Airbus A330-300 (A333)', category: 'Commercial Passenger', defaultMtow: 242, defaultSeats: 305 },
  { id: 'a330-900', name: 'Airbus A330-900 (A339)', category: 'Commercial Passenger', defaultMtow: 242, defaultSeats: 310 },
  { id: 'a350-900', name: 'Airbus A350-900 (A359)', category: 'Commercial Passenger', defaultMtow: 280, defaultSeats: 325 },
  { id: 'a350-1000', name: 'Airbus A350-1000 (A35K)', category: 'Commercial Passenger', defaultMtow: 319, defaultSeats: 380 },
  { id: 'a380-800', name: 'Airbus A380-800 (A388)', category: 'Commercial Passenger', defaultMtow: 597, defaultSeats: 525 },

  // Commercial Passenger - Boeing
  { id: 'b737-700', name: 'Boeing 737-700 (B737)', category: 'Commercial Passenger', defaultMtow: 71, defaultSeats: 149 },
  { id: 'b737-800', name: 'Boeing 737-800 (B738)', category: 'Commercial Passenger', defaultMtow: 83, defaultSeats: 189 },
  { id: 'b737-max8', name: 'Boeing 737 Max 8 (B38M)', category: 'Commercial Passenger', defaultMtow: 83, defaultSeats: 189 },
  { id: 'b737-max9', name: 'Boeing 737 Max 9 (B39M)', category: 'Commercial Passenger', defaultMtow: 89, defaultSeats: 220 },
  { id: 'b767-300', name: 'Boeing 767-300 (B763)', category: 'Commercial Passenger', defaultMtow: 189, defaultSeats: 269 },
  { id: 'b777-200', name: 'Boeing 777-200 (B772)', category: 'Commercial Passenger', defaultMtow: 352, defaultSeats: 312 },
  { id: 'b777-300er', name: 'Boeing 777-300 ER (B77W)', category: 'Commercial Passenger', defaultMtow: 360, defaultSeats: 400 },
  { id: 'b787-8', name: 'Boeing 787-8 Dreamliner (B788)', category: 'Commercial Passenger', defaultMtow: 228, defaultSeats: 250 },
  { id: 'b787-9', name: 'Boeing 787-9 Dreamliner (B789)', category: 'Commercial Passenger', defaultMtow: 298, defaultSeats: 300 },
  { id: 'b787-10', name: 'Boeing 787-10 Dreamliner (B78X)', category: 'Commercial Passenger', defaultMtow: 300, defaultSeats: 330 },
  { id: 'b747-800', name: 'Boeing 747-800 Pax (B748)', category: 'Commercial Passenger', defaultMtow: 449, defaultSeats: 467 },

  // Regional & Turboprop
  { id: 'atr72-600', name: 'ATR 72-600 (AT76)', category: 'Commercial Passenger', defaultMtow: 23, defaultSeats: 72 },
  { id: 'e195-e2', name: 'Embraer E195-E2 (E295)', category: 'Commercial Passenger', defaultMtow: 62, defaultSeats: 132 },
  { id: 'e190', name: 'Embraer ERJ 190 (E190)', category: 'Commercial Passenger', defaultMtow: 56.4, defaultSeats: 100 },
  { id: 'crj900', name: 'Bombardier CRJ900 (CRJ9)', category: 'Commercial Passenger', defaultMtow: 39, defaultSeats: 90 },

  // Cargo Aircraft
  { id: 'b777f', name: 'Boeing 777 Freighter (B77L Cargo)', category: 'Commercial Cargo', defaultMtow: 350, defaultSeats: 0 },
  { id: 'b747-400f', name: 'Boeing 747-400 Freighter (B744)', category: 'Commercial Cargo', defaultMtow: 415, defaultSeats: 0 },
  { id: 'b767-300f', name: 'Boeing 767-300 Freighter (B763)', category: 'Commercial Cargo', defaultMtow: 187, defaultSeats: 0 },
  { id: 'a330-200f', name: 'Airbus A330-200F Cargo (A332)', category: 'Commercial Cargo', defaultMtow: 233, defaultSeats: 0 },
  { id: 'an-124', name: 'Antonov An-124 (A124)', category: 'Commercial Cargo', defaultMtow: 402, defaultSeats: 0 },

  // Business Jets & Private Aviation
  { id: 'c680', name: 'Cessna 680 Citation Sovereign (C680)', category: 'General Aviation / Private', defaultMtow: 22, defaultSeats: 10 },
  { id: 'c560xl', name: 'Cessna 560XL Citation Excel (C56X)', category: 'General Aviation / Private', defaultMtow: 10, defaultSeats: 7 },
  { id: 'g650', name: 'Gulfstream G650 (GLF6)', category: 'General Aviation / Private', defaultMtow: 47.1, defaultSeats: 17 },
  { id: 'g700', name: 'Gulfstream G700 (GA7C)', category: 'General Aviation / Private', defaultMtow: 49, defaultSeats: 16 },
  { id: 'g550', name: 'Gulfstream G550 (GLF5)', category: 'General Aviation / Private', defaultMtow: 46, defaultSeats: 17 },
  { id: 'global-6000', name: 'Bombardier Global 6000 (GL6T)', category: 'General Aviation / Private', defaultMtow: 46, defaultSeats: 13 },
  { id: 'global-7500', name: 'Bombardier Global 7500 (GL7T)', category: 'General Aviation / Private', defaultMtow: 53, defaultSeats: 14 },
  { id: 'challenger-350', name: 'Bombardier Challenger 350 (CL35)', category: 'General Aviation / Private', defaultMtow: 19, defaultSeats: 10 },
  { id: 'falcon-8x', name: 'Dassault Falcon 8X (FA8X)', category: 'General Aviation / Private', defaultMtow: 34, defaultSeats: 14 },
  { id: 'praetor-600', name: 'Embraer Praetor 600 (EMP6)', category: 'General Aviation / Private', defaultMtow: 21.4, defaultSeats: 9 },

  // Helicopters
  { id: 's92', name: 'Sikorsky S-92 (S92)', category: 'General Aviation / Private', defaultMtow: 12, defaultSeats: 19 },
  { id: 's70', name: 'Sikorsky S-70 (S070)', category: 'General Aviation / Private', defaultMtow: 6, defaultSeats: 8 },

  // Custom / Manual Entry
  { id: 'custom', name: 'Özel Uçak Tipi (Manuel MTOW / Koltuk Girdisi)', category: 'Commercial Passenger', defaultMtow: 50, defaultSeats: 100 },
];
