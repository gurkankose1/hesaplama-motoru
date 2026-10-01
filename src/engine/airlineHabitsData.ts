export interface AirlineHabit {
  gpuMins: number;
  pbbMins: number;
  pcaMins: number;
  waterRefills: number;
}

export const PRETRAINED_AIRLINE_HABITS: Record<string, AirlineHabit> = {
  "Aegean Airlines": { "gpuMins": 49, "pbbMins": 66, "pcaMins": 44, "waterRefills": 1 },
  "Aeroflot Russian Airlines": { "gpuMins": 92, "pbbMins": 107, "pcaMins": 70, "waterRefills": 1 },
  "AIR ALGERIE": { "gpuMins": 63, "pbbMins": 78, "pcaMins": 57, "waterRefills": 1 },
  "Air Arabia": { "gpuMins": 55, "pbbMins": 69, "pcaMins": 53, "waterRefills": 1 },
  "Air Arabia Maroc": { "gpuMins": 44, "pbbMins": 55, "pcaMins": 90, "waterRefills": 1 },
  "Air Astana": { "gpuMins": 66, "pbbMins": 79, "pcaMins": 62, "waterRefills": 1 },
  "Air Cairo": { "gpuMins": 55, "pbbMins": 68, "pcaMins": 52, "waterRefills": 1 },
  "Air China": { "gpuMins": 374, "pbbMins": 221, "pcaMins": 180, "waterRefills": 1 },
  "Air Europa": { "gpuMins": 66, "pbbMins": 72, "pcaMins": 45, "waterRefills": 1 },
  "Air France": { "gpuMins": 71, "pbbMins": 84, "pcaMins": 62, "waterRefills": 1 },
  "Air India": { "gpuMins": 83, "pbbMins": 114, "pcaMins": 94, "waterRefills": 1 },
  "Air Montenegro": { "gpuMins": 55, "pbbMins": 67, "pcaMins": 90, "waterRefills": 1 },
  "Air Serbia": { "gpuMins": 57, "pbbMins": 69, "pcaMins": 47, "waterRefills": 1 },
  "AJet": { "gpuMins": 76, "pbbMins": 80, "pcaMins": 58, "waterRefills": 1 },
  "All Nippon Airways": { "gpuMins": 105, "pbbMins": 133, "pcaMins": 113, "waterRefills": 1 },
  "Arkia Israeli Airlines": { "gpuMins": 53, "pbbMins": 73, "pcaMins": 61, "waterRefills": 1 },
  "Asiana Airlines": { "gpuMins": 110, "pbbMins": 140, "pcaMins": 115, "waterRefills": 1 },
  "Azerbaijan Airlines": { "gpuMins": 78, "pbbMins": 96, "pcaMins": 71, "waterRefills": 1 },
  "Badr Airlines": { "gpuMins": 68, "pbbMins": 82, "pcaMins": 65, "waterRefills": 1 },
  "Belavia Belarusian Airlines": { "gpuMins": 73, "pbbMins": 89, "pcaMins": 66, "waterRefills": 1 },
  "British Airways": { "gpuMins": 78, "pbbMins": 95, "pcaMins": 68, "waterRefills": 1 },
  "China Southern Airlines": { "gpuMins": 125, "pbbMins": 155, "pcaMins": 120, "waterRefills": 1 },
  "Corendon Airlines": { "gpuMins": 52, "pbbMins": 64, "pcaMins": 45, "waterRefills": 1 },
  "EgyptAir": { "gpuMins": 81, "pbbMins": 102, "pcaMins": 75, "waterRefills": 1 },
  "Emirates Airline": { "gpuMins": 45, "pbbMins": 108, "pcaMins": 41, "waterRefills": 1 },
  "Ethiopian Airlines": { "gpuMins": 95, "pbbMins": 120, "pcaMins": 90, "waterRefills": 1 },
  "Etihad Airways": { "gpuMins": 98, "pbbMins": 125, "pcaMins": 88, "waterRefills": 1 },
  "Flydubai": { "gpuMins": 58, "pbbMins": 71, "pcaMins": 52, "waterRefills": 1 },
  "Flynas": { "gpuMins": 63, "pbbMins": 76, "pcaMins": 58, "waterRefills": 1 },
  "Gulf Air": { "gpuMins": 72, "pbbMins": 89, "pcaMins": 67, "waterRefills": 1 },
  "IndiGo Airlines": { "gpuMins": 62, "pbbMins": 75, "pcaMins": 55, "waterRefills": 1 },
  "Iran Air": { "gpuMins": 87, "pbbMins": 108, "pcaMins": 84, "waterRefills": 1 },
  "Iran Airtour": { "gpuMins": 75, "pbbMins": 92, "pcaMins": 63, "waterRefills": 1 },
  "Iraqi Airways": { "gpuMins": 78, "pbbMins": 94, "pcaMins": 71, "waterRefills": 1 },
  "JAL Japan Airlines": { "gpuMins": 108, "pbbMins": 138, "pcaMins": 110, "waterRefills": 1 },
  "Jazeera Airways": { "gpuMins": 54, "pbbMins": 67, "pcaMins": 48, "waterRefills": 1 },
  "KLM Royal Dutch Airlines": { "gpuMins": 74, "pbbMins": 91, "pcaMins": 65, "waterRefills": 1 },
  "Korean Air": { "gpuMins": 115, "pbbMins": 145, "pcaMins": 118, "waterRefills": 1 },
  "Kuwait Airways": { "gpuMins": 82, "pbbMins": 105, "pcaMins": 77, "waterRefills": 1 },
  "LOT Polish Airlines": { "gpuMins": 65, "pbbMins": 74, "pcaMins": 54, "waterRefills": 1 },
  "Lufthansa": { "gpuMins": 87, "pbbMins": 98, "pcaMins": 70, "waterRefills": 1 },
  "Mahan Air": { "gpuMins": 80, "pbbMins": 102, "pcaMins": 74, "waterRefills": 1 },
  "Middle East Airlines": { "gpuMins": 68, "pbbMins": 84, "pcaMins": 61, "waterRefills": 1 },
  "Oman Air": { "gpuMins": 85, "pbbMins": 110, "pcaMins": 79, "waterRefills": 1 },
  "Pakistan International Airlines": { "gpuMins": 89, "pbbMins": 115, "pcaMins": 84, "waterRefills": 1 },
  "Pegasus Airlines": { "gpuMins": 48, "pbbMins": 58, "pcaMins": 40, "waterRefills": 1 },
  "Pobeda Airlines": { "gpuMins": 44, "pbbMins": 54, "pcaMins": 38, "waterRefills": 1 },
  "Qatar Airways": { "gpuMins": 116, "pbbMins": 135, "pcaMins": 82, "waterRefills": 1 },
  "Royal Air Maroc": { "gpuMins": 70, "pbbMins": 87, "pcaMins": 62, "waterRefills": 1 },
  "Royal Jordanian": { "gpuMins": 67, "pbbMins": 83, "pcaMins": 60, "waterRefills": 1 },
  "S7 Airlines": { "gpuMins": 60, "pbbMins": 72, "pcaMins": 51, "waterRefills": 1 },
  "Saudia Arabian Airlines": { "gpuMins": 76, "pbbMins": 92, "pcaMins": 73, "waterRefills": 1 },
  "Singapore Airlines": { "gpuMins": 120, "pbbMins": 150, "pcaMins": 125, "waterRefills": 1 },
  "Somon Air": { "gpuMins": 65, "pbbMins": 78, "pcaMins": 55, "waterRefills": 1 },
  "SunExpress": { "gpuMins": 50, "pbbMins": 62, "pcaMins": 42, "waterRefills": 1 },
  "TAROM": { "gpuMins": 58, "pbbMins": 70, "pcaMins": 48, "waterRefills": 1 },
  "Thai Airways": { "gpuMins": 118, "pbbMins": 148, "pcaMins": 120, "waterRefills": 1 },
  "Tunisair": { "gpuMins": 67, "pbbMins": 82, "pcaMins": 58, "waterRefills": 1 },
  "Turkish Airlines": { "gpuMins": 155, "pbbMins": 136, "pcaMins": 94, "waterRefills": 1 },
  "Turkmenistan Airlines": { "gpuMins": 74, "pbbMins": 90, "pcaMins": 65, "waterRefills": 1 },
  "Uzbekistan Airways": { "gpuMins": 83, "pbbMins": 100, "pcaMins": 78, "waterRefills": 1 },
  "Wizz Air": { "gpuMins": 42, "pbbMins": 52, "pcaMins": 35, "waterRefills": 1 },
  "DEFAULT": { "gpuMins": 90, "pbbMins": 90, "pcaMins": 60, "waterRefills": 1 }
};

export function getAirlineHabit(airlineName?: string): AirlineHabit {
  if (!airlineName) return PRETRAINED_AIRLINE_HABITS["DEFAULT"];
  const cleanName = airlineName.trim();

  if (PRETRAINED_AIRLINE_HABITS[cleanName]) {
    return PRETRAINED_AIRLINE_HABITS[cleanName];
  }

  // Fuzzy match (e.g. "TK/THY Turkish Airlines" -> "Turkish Airlines")
  const key = Object.keys(PRETRAINED_AIRLINE_HABITS).find(
    (k) => cleanName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(cleanName.toLowerCase())
  );

  if (key) {
    return PRETRAINED_AIRLINE_HABITS[key];
  }

  return PRETRAINED_AIRLINE_HABITS["DEFAULT"];
}