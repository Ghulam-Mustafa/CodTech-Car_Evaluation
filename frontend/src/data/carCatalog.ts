// Static catalog used to populate the brand + variant dropdowns on the
// vehicle evaluation form. Extend this list as needed — the form logic
// doesn't care how many brands/variants exist.

export const CAR_CATALOG: Record<string, string[]> = {
  "Maruti Suzuki": ["Swift", "Baleno", "Dzire", "WagonR", "Ertiga", "Brezza", "Alto K10", "Fronx"],
  Hyundai: ["Creta", "Venue", "i20", "Verna", "Grand i10 Nios", "Exter", "Alcazar"],
  Tata: ["Nexon", "Punch", "Altroz", "Tiago", "Harrier", "Safari"],
  Mahindra: ["Scorpio-N", "XUV700", "Thar", "Bolero", "XUV300"],
  Honda: ["City", "Amaze", "Elevate", "Civic"],
  Toyota: ["Innova Crysta", "Fortuner", "Glanza", "Urban Cruiser Hyryder", "Camry"],
  Kia: ["Seltos", "Sonet", "Carens", "Carnival"],
  "Volkswagen": ["Virtus", "Taigun", "Polo"],
  Skoda: ["Slavia", "Kushaq", "Octavia"],
  Renault: ["Kwid", "Triber", "Kiger"],
  Nissan: ["Magnite"],
  Ford: ["EcoSport", "Endeavour", "Figo"],
  Jeep: ["Compass", "Meridian"],
  MG: ["Hector", "Astor", "Gloster"],
  BMW: ["3 Series", "5 Series", "X1", "X3"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLA", "GLC"],
  Audi: ["A4", "A6", "Q3", "Q5"],
};

export const BRANDS = Object.keys(CAR_CATALOG);
