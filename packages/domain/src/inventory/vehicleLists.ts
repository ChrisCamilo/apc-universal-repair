// The vehicle brands and models a server's lists start with: the 21 brands most sold in Brazil in 2025, by FENABRAVE's
// public report (cars and light commercial vehicles, RAM counted as Dodge), and Chrysler, Gurgel, Puma, DKW, Miura, Saab,
// Daewoo, Kia and Iveco, each with its usual models in Brazil, old and new. Each model was confirmed as sold in Brazil by
// Wikipedia in Portuguese, read only for that fact; a model it didn't confirm is left out (see docs/licenses.md, "Vehicle
// data"). Names are the ones used in Brazil, with the brand's own accents and capitals ("Citroën", "up!", "iX1").
// The migration 20261112000000_vehicle_lists adds them to every server, unless its lists hold a name already, after
// bringing a brand typed under another name (VEHICLE_BRAND_ALIASES) together with its standard one.

/** A brand of the starting vehicle lists, with its models. */
export type StartingVehicleBrand = { name: string; models: readonly string[] };

/** The vehicle brands and models a server's lists start with. */
export const STARTING_VEHICLE_BRANDS: readonly StartingVehicleBrand[] = [
  {
    name: "Fiat",
    models: [
      "147", "Uno", "Prêmio", "Elba", "Oggi", "Panorama", "Tempra", "Tipo", "Palio", "Siena", "Marea", "Brava", "Stilo",
      "Idea", "Punto", "Linea", "Bravo", "Doblò", "500", "Freemont", "Strada", "Argo", "Mobi", "Cronos", "Pulse",
      "Fastback", "Toro", "Titano", "Fiorino", "Ducato", "500e",
    ],
  },
  {
    name: "Volkswagen",
    models: [
      "Fusca", "Kombi", "Karmann-Ghia", "SP2", "Variant", "Variant II", "Brasília", "Passat", "Gol", "Parati",
      "Saveiro", "Voyage", "Santana", "Santana Quantum", "Logus", "Pointer", "Apollo", "Golf", "Fox", "SpaceFox", "up!",
      "Bora", "Polo", "Virtus", "T-Cross", "Nivus", "Taos", "Tera", "Jetta", "Amarok",
    ],
  },
  {
    name: "Chevrolet",
    models: [
      "Opala", "Chevette", "Chevy 500", "Marajó", "Monza", "Kadett", "Ipanema", "Veraneio", "Corsa", "Celta", "Classic",
      "Astra", "Vectra", "Omega", "Blazer", "Silverado", "Meriva", "Zafira", "Agile", "Cobalt", "Sonic", "Cruze",
      "Captiva", "Camaro", "Malibu", "Onix", "Onix Plus", "Tracker", "Montana", "Spin", "S10", "Trailblazer", "Equinox",
      "Captiva EV", "Blazer EV", "Bolt EUV",
    ],
  },
  {
    name: "Hyundai",
    models: [
      "Terracan", "i30", "ix35", "Veloster", "Azera", "Veracruz", "Genesis", "Equus", "HB20", "HB20S", "Creta",
      "Tucson", "Santa Fe",
    ],
  },
  {
    name: "Toyota",
    models: [
      "Bandeirante", "Fielder", "Etios", "Corolla", "Corolla Cross", "Hilux", "SW4", "RAV4", "Camry", "Prius",
    ],
  },
  {
    name: "Renault",
    models: [
      "Dauphine", "Gordini", "19", "21", "Twingo", "Clio", "Mégane", "Scénic", "Laguna", "Kangoo", "Symbol", "Logan",
      "Sandero", "Fluence", "Captur", "Kwid", "Kardian", "Duster", "Oroch", "Boreal", "Master",
    ],
  },
  { name: "Jeep", models: ["Renegade", "Compass", "Commander"] },
  { name: "BYD", models: ["Tang", "Dolphin", "Song Plus", "King"] },
  { name: "Honda", models: ["Legend", "Fit", "City", "HR-V", "WR-V", "Civic", "ZR-V", "Accord"] },
  { name: "Nissan", models: ["Tiida", "Livina", "Grand Livina", "Kicks", "Kait", "Sentra", "Frontier", "Leaf"] },
  {
    name: "Caoa Chery",
    models: [
      "QQ", "Face", "Celer", "Cielo", "Tiggo", "Tiggo 2", "Tiggo 3X", "Arrizo 5", "Tiggo 5X", "Tiggo 7", "Tiggo 8",
      "iCar",
    ],
  },
  {
    name: "Ford",
    models: [
      "Corcel", "Belina", "Galaxie", "Rural", "F-1000", "Del Rey", "Escort", "Pampa", "Verona", "Versailles", "Royale",
      "Fiesta", "Ka", "EcoSport", "Focus", "Fusion", "Courier", "Mondeo", "Ranger", "Maverick", "Territory", "Mustang",
    ],
  },
  { name: "GWM", models: [] },
  {
    name: "Citroën",
    models: [
      "XM", "Xsara", "Xsara Picasso", "C4 Lounge", "C5", "Berlingo", "C3", "Basalt", "C4 Cactus", "Jumpy",
    ],
  },
  { name: "Dodge", models: ["Dart", "Polara", "Magnum", "Le Baron", "Dakota", "Journey", "Viper", "RAM Rampage"] },
  {
    name: "Mitsubishi",
    models: [
      "Pajero", "L200", "Lancer", "Lancer Evolution", "Eclipse", "ASX", "Eclipse Cross", "Outlander",
    ],
  },
  {
    name: "Peugeot",
    models: [
      "205", "206", "207", "307", "308", "405", "407", "408", "Hoggar", "RCZ", "208", "2008", "Partner",
    ],
  },
  { name: "BMW", models: ["Série 1", "X4"] },
  { name: "Mercedes-Benz", models: ["Classe A", "Classe C", "Classe G", "Sprinter"] },
  { name: "Volvo", models: ["C30", "XC90"] },
  { name: "Omoda Jaecoo", models: [] },
  { name: "Chrysler", models: ["Esplanada", "Neon", "Stratus", "PT Cruiser", "Le Baron"] },
  {
    name: "Gurgel",
    models: [
      "X-10", "X-12", "X-15", "Tocantins", "Carajás", "Itaipu E-150", "G-15", "BR-800", "Supermini", "Motomachine",
    ],
  },
  { name: "Puma", models: ["GT", "GTE", "GTS", "GTB", "GTC", "GTI", "P-018", "AMV"] },
  { name: "DKW", models: ["Universal", "Belcar", "Vemaguet", "Candango", "Fissore", "Caiçara", "Pracinha"] },
  { name: "Miura", models: ["Sport", "Targa", "Kabrio", "Saga", "X8", "X11", "Top Sport", "Spider"] },
  { name: "Saab", models: [] },
  { name: "Daewoo", models: ["Espero", "Lanos", "Nubira", "Matiz"] },
  {
    name: "Kia",
    models: [
      "Besta", "Sephia", "Clarus", "Magentis", "Cadenza", "Quoris", "Rio", "Sportage", "Stonic", "Sorento", "Bongo",
    ],
  },
  { name: "Iveco", models: ["Daily"] },
];

/** The other names a brand is typed with, each to its standard name in STARTING_VEHICLE_BRANDS. */
export const VEHICLE_BRAND_ALIASES: Readonly<Record<string, string>> = {
  GM: "Chevrolet",
  VW: "Volkswagen",
  "M.Benz": "Mercedes-Benz",
  Mercedes: "Mercedes-Benz",
  "Mercedes Benz": "Mercedes-Benz",
  Chery: "Caoa Chery",
  "Great Wall": "GWM",
  Haval: "GWM",
  RAM: "Dodge",
};
