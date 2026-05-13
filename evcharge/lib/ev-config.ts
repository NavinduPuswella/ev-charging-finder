export const CONNECTOR_TYPES = ["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export const VEHICLE_TYPES = ["Hatchback EV", "Sedan EV", "SUV EV", "Van EV"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export interface EvModelConfig {
    id: string;
    brand: string;
    model: string;
    vehicleType: VehicleType;
    batteryCapacity: number;
    suggestedRange: number;
    minRange: number;
    maxRange: number;
    supportedConnectors: ConnectorType[];
    optionalChargingSpeed?: number;
    aliases?: string[];
}

export interface VehicleTypeFallbackConfig {
    vehicleType: VehicleType;
    minRange: number;
    maxRange: number;
    suggestedRange: number;
    minBatteryCapacity: number;
    maxBatteryCapacity: number;
    supportedConnectors: ConnectorType[];
    minEfficiencyKmPerKwh: number;
    maxEfficiencyKmPerKwh: number;
}


export const KNOWN_EV_MODELS: EvModelConfig[] = [
    
    {
        id: "byd-atto-1",
        brand: "BYD",
        model: "ATTO 1",
        vehicleType: "Hatchback EV",
        batteryCapacity: 38,
        suggestedRange: 265,
        minRange: 190,
        maxRange: 315,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 40,
        aliases: ["Seagull", "BYD Seagull", "ATTO1"],
    },
    {
        id: "byd-atto-2",
        brand: "BYD",
        model: "ATTO 2",
        vehicleType: "SUV EV",
        batteryCapacity: 45,
        suggestedRange: 312,
        minRange: 225,
        maxRange: 370,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 65,
        aliases: ["ATTO2"],
    },
    {
        id: "byd-dolphin",
        brand: "BYD",
        model: "Dolphin",
        vehicleType: "Hatchback EV",
        batteryCapacity: 60,
        suggestedRange: 427,
        minRange: 305,
        maxRange: 505,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 88,
    },
    {
        id: "byd-atto-3",
        brand: "BYD",
        model: "ATTO 3",
        vehicleType: "SUV EV",
        batteryCapacity: 60,
        suggestedRange: 420,
        minRange: 300,
        maxRange: 500,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 88,
        aliases: ["ATTO3", "Yuan Plus"],
    },
    {
        id: "byd-m6",
        brand: "BYD",
        model: "M6",
        vehicleType: "SUV EV",
        batteryCapacity: 55,
        suggestedRange: 390,
        minRange: 280,
        maxRange: 460,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 88,
    },
    {
        id: "byd-seal",
        brand: "BYD",
        model: "Seal",
        vehicleType: "Sedan EV",
        batteryCapacity: 83,
        suggestedRange: 570,
        minRange: 410,
        maxRange: 675,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 150,
    },
    {
        id: "byd-sealion-5",
        brand: "BYD",
        model: "Sealion 5",
        vehicleType: "SUV EV",
        batteryCapacity: 72,
        suggestedRange: 420,
        minRange: 300,
        maxRange: 500,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 140,
        aliases: ["Sea Lion 5", "Sealion5", "SEALION 05", "Sea Lion 05"],
    },
    {
        id: "byd-sealion-6",
        brand: "BYD",
        model: "Sealion 6",
        vehicleType: "SUV EV",
        batteryCapacity: 72,
        suggestedRange: 400,
        minRange: 290,
        maxRange: 475,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 140,
        aliases: ["Sea Lion 6", "Sealion6", "SEALION 06", "Sea Lion 06"],
    },
    {
        id: "byd-sealion-8",
        brand: "BYD",
        model: "Sealion 8",
        vehicleType: "SUV EV",
        batteryCapacity: 87,
        suggestedRange: 500,
        minRange: 360,
        maxRange: 590,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 170,
        aliases: ["Sea Lion 8", "Sealion8", "SEALION 08", "Sea Lion 08"],
    },
    {
        id: "byd-shark-6",
        brand: "BYD",
        model: "Shark 6",
        vehicleType: "SUV EV",
        batteryCapacity: 30,
        suggestedRange: 100,
        minRange: 60,
        maxRange: 130,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 70,
        aliases: ["Shark6", "BYD Shark"],
    },

    
    {
        id: "nissan-leaf-ze0",
        brand: "Nissan",
        model: "Leaf ZE0",
        vehicleType: "Hatchback EV",
        batteryCapacity: 24,
        suggestedRange: 170,
        minRange: 120,
        maxRange: 200,
        supportedConnectors: ["Type1", "CHAdeMO"],
        optionalChargingSpeed: 50,
        aliases: ["Leaf 24kWh", "Leaf Gen1"],
    },
    {
        id: "nissan-leaf-aze0",
        brand: "Nissan",
        model: "Leaf AZE0",
        vehicleType: "Hatchback EV",
        batteryCapacity: 30,
        suggestedRange: 200,
        minRange: 140,
        maxRange: 240,
        supportedConnectors: ["Type1", "CHAdeMO"],
        optionalChargingSpeed: 50,
        aliases: ["Leaf 30kWh"],
    },
    {
        id: "nissan-leaf-ze1",
        brand: "Nissan",
        model: "Leaf ZE1",
        vehicleType: "Hatchback EV",
        batteryCapacity: 40,
        suggestedRange: 270,
        minRange: 195,
        maxRange: 320,
        supportedConnectors: ["Type2", "CHAdeMO"],
        optionalChargingSpeed: 50,
        aliases: ["Leaf 40kWh", "Leaf Gen2"],
    },
    {
        id: "nissan-sakura",
        brand: "Nissan",
        model: "Sakura",
        vehicleType: "Hatchback EV",
        batteryCapacity: 20,
        suggestedRange: 180,
        minRange: 130,
        maxRange: 215,
        supportedConnectors: ["Type1", "CHAdeMO"],
        optionalChargingSpeed: 30,
    },


    {
        id: "bmw-i3",
        brand: "BMW",
        model: "i3",
        vehicleType: "Hatchback EV",
        batteryCapacity: 42,
        suggestedRange: 310,
        minRange: 225,
        maxRange: 365,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 50,
    },
    {
        id: "bmw-i4",
        brand: "BMW",
        model: "i4",
        vehicleType: "Sedan EV",
        batteryCapacity: 84,
        suggestedRange: 590,
        minRange: 425,
        maxRange: 695,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 200,
    },
    {
        id: "bmw-i7",
        brand: "BMW",
        model: "i7",
        vehicleType: "Sedan EV",
        batteryCapacity: 102,
        suggestedRange: 625,
        minRange: 450,
        maxRange: 740,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 195,
    },
    {
        id: "bmw-ix3",
        brand: "BMW",
        model: "iX3",
        vehicleType: "SUV EV",
        batteryCapacity: 74,
        suggestedRange: 460,
        minRange: 330,
        maxRange: 545,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 150,
    },


    {
        id: "mg-zs-ev",
        brand: "MG",
        model: "ZS EV",
        vehicleType: "SUV EV",
        batteryCapacity: 51,
        suggestedRange: 330,
        minRange: 240,
        maxRange: 390,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 92,
        aliases: ["MG ZS", "ZS"],
    },
    {
        id: "mg-4-electric",
        brand: "MG",
        model: "4 Electric",
        vehicleType: "Hatchback EV",
        batteryCapacity: 51,
        suggestedRange: 350,
        minRange: 250,
        maxRange: 415,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 117,
        aliases: ["MG4", "MG4 Electric", "MG 4"],
    },
    {
        id: "mg-4-x",
        brand: "MG",
        model: "4 X",
        vehicleType: "Hatchback EV",
        batteryCapacity: 64,
        suggestedRange: 435,
        minRange: 315,
        maxRange: 515,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 140,
        aliases: ["MG4 X", "MG4X", "MG 4X", "XPOWER"],
    },
    {
        id: "mg-5-ev",
        brand: "MG",
        model: "5 EV",
        vehicleType: "Sedan EV",
        batteryCapacity: 61,
        suggestedRange: 400,
        minRange: 290,
        maxRange: 475,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 87,
        aliases: ["MG5", "MG5 EV", "MG 5"],
    },
    {
        id: "mg-s5-ev",
        brand: "MG",
        model: "S5 EV",
        vehicleType: "Sedan EV",
        batteryCapacity: 62,
        suggestedRange: 400,
        minRange: 290,
        maxRange: 475,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 150,
        aliases: ["MG S5", "S5"],
    },

    
    {
        id: "hyundai-ioniq-electric",
        brand: "Hyundai",
        model: "IONIQ Electric",
        vehicleType: "Hatchback EV",
        batteryCapacity: 38,
        suggestedRange: 294,
        minRange: 210,
        maxRange: 350,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 70,
        aliases: ["IONIQ", "Ioniq EV"],
    },
    {
        id: "hyundai-kona-electric",
        brand: "Hyundai",
        model: "Kona Electric",
        vehicleType: "SUV EV",
        batteryCapacity: 64,
        suggestedRange: 484,
        minRange: 350,
        maxRange: 570,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 100,
        aliases: ["Kona EV", "Kona"],
    },
    {
        id: "hyundai-ioniq-5",
        brand: "Hyundai",
        model: "IONIQ 5",
        vehicleType: "SUV EV",
        batteryCapacity: 73,
        suggestedRange: 460,
        minRange: 330,
        maxRange: 545,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 220,
        aliases: ["Ioniq5", "IONIQ5"],
    },
    {
        id: "hyundai-ioniq-9",
        brand: "Hyundai",
        model: "IONIQ 9",
        vehicleType: "SUV EV",
        batteryCapacity: 110,
        suggestedRange: 620,
        minRange: 445,
        maxRange: 730,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 350,
        aliases: ["Ioniq9", "IONIQ9"],
    },

    
    {
        id: "kia-niro-ev",
        brand: "Kia",
        model: "Niro EV",
        vehicleType: "SUV EV",
        batteryCapacity: 65,
        suggestedRange: 460,
        minRange: 330,
        maxRange: 545,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 100,
        aliases: ["Niro", "e-Niro"],
    },
    {
        id: "kia-ev6",
        brand: "Kia",
        model: "EV6",
        vehicleType: "SUV EV",
        batteryCapacity: 77,
        suggestedRange: 490,
        minRange: 355,
        maxRange: 580,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 240,
    },
    {
        id: "kia-ev9",
        brand: "Kia",
        model: "EV9",
        vehicleType: "SUV EV",
        batteryCapacity: 100,
        suggestedRange: 540,
        minRange: 390,
        maxRange: 640,
        supportedConnectors: ["Type2", "CCS"],
        optionalChargingSpeed: 250,
    },


    {
        id: "tesla-model-3-rwd",
        brand: "Tesla",
        model: "Model 3",
        vehicleType: "Sedan EV",
        batteryCapacity: 60,
        suggestedRange: 490,
        minRange: 355,
        maxRange: 580,
        supportedConnectors: ["Type2", "CCS", "Tesla"],
        optionalChargingSpeed: 170,
    },
];


export const VEHICLE_TYPE_FALLBACK_CONFIG: Record<VehicleType, VehicleTypeFallbackConfig> = {
    "Hatchback EV": {
        vehicleType: "Hatchback EV",
        minRange: 100,
        maxRange: 520,
        suggestedRange: 320,
        minBatteryCapacity: 15,
        maxBatteryCapacity: 75,
        supportedConnectors: ["Type1", "Type2", "CCS", "CHAdeMO"],
        minEfficiencyKmPerKwh: 3.2,
        maxEfficiencyKmPerKwh: 9.5,
    },
    "Sedan EV": {
        vehicleType: "Sedan EV",
        minRange: 220,
        maxRange: 760,
        suggestedRange: 500,
        minBatteryCapacity: 45,
        maxBatteryCapacity: 120,
        supportedConnectors: ["Type2", "CCS", "Tesla"],
        minEfficiencyKmPerKwh: 3.3,
        maxEfficiencyKmPerKwh: 8.8,
    },
    "SUV EV": {
        vehicleType: "SUV EV",
        minRange: 50,
        maxRange: 750,
        suggestedRange: 420,
        minBatteryCapacity: 25,
        maxBatteryCapacity: 120,
        supportedConnectors: ["Type2", "CCS", "Tesla", "CHAdeMO"],
        minEfficiencyKmPerKwh: 2.0,
        maxEfficiencyKmPerKwh: 7.5,
    },
    "Van EV": {
        vehicleType: "Van EV",
        minRange: 180,
        maxRange: 520,
        suggestedRange: 320,
        minBatteryCapacity: 40,
        maxBatteryCapacity: 130,
        supportedConnectors: ["Type2", "CCS", "CHAdeMO"],
        minEfficiencyKmPerKwh: 2.1,
        maxEfficiencyKmPerKwh: 5.6,
    },
};



export const getModelLabel = (m: Pick<EvModelConfig, "brand" | "model">) =>
    `${m.brand} ${m.model}`;

export const getKnownEvModelById = (id?: string | null) =>
    KNOWN_EV_MODELS.find((m) => m.id === id);

export const isConnectorType = (value: string): value is ConnectorType =>
    CONNECTOR_TYPES.includes(value as ConnectorType);

export const isVehicleType = (value: string): value is VehicleType =>
    VEHICLE_TYPES.includes(value as VehicleType);

/**
 * Search the known EV model catalog.
 * Supports case-insensitive partial matching, spacing variations
 * (e.g. "atto3" matches "ATTO 3"), and alias matching.
 */
export function searchEvModels(query: string, limit = 10): EvModelConfig[] {
    const raw = query.trim().toLowerCase();
    if (!raw) return KNOWN_EV_MODELS.slice(0, limit);

    const collapsed = raw.replace(/\s+/g, "");

    return KNOWN_EV_MODELS.filter((ev) => {
        const fullLabel = `${ev.brand} ${ev.model}`.toLowerCase();
        const fullText = `${fullLabel} ${ev.vehicleType}`.toLowerCase();
        const collapsedText = fullText.replace(/\s+/g, "");

        if (fullText.includes(raw) || collapsedText.includes(collapsed)) return true;

        if (ev.aliases) {
            return ev.aliases.some((alias) => {
                const a = alias.toLowerCase();
                return a.includes(raw) || a.replace(/\s+/g, "").includes(collapsed)
                    || raw.includes(a) || collapsed.includes(a.replace(/\s+/g, ""));
            });
        }

        return false;
    }).slice(0, limit);
}
