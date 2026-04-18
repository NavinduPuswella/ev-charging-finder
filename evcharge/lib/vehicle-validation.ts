import {
    CONNECTOR_TYPES,
    getKnownEvModelById,
    isConnectorType,
    isVehicleType,
    type ConnectorType,
    type EvModelConfig,
    type VehicleType,
    VEHICLE_TYPE_FALLBACK_CONFIG,
} from "@/lib/ev-config";

export interface VehicleValidationInput {
    selectedModelId?: string | null;
    brand?: string;
    model?: string;
    vehicleType?: string;
    batteryCapacity?: number;
    rangeKm?: number;
    chargingType?: string;
    chargingSpeedKw?: number | null;
}

export interface NormalizedVehiclePayload {
    selectedModelId: string | null;
    brand: string;
    model: string;
    vehicleType: VehicleType;
    batteryCapacity: number;
    rangeKm: number;
    chargingType: ConnectorType;
    chargingSpeedKw?: number;
    supportedConnectors: ConnectorType[];
    isKnownModel: boolean;
}

type VehicleValidationErrors = Partial<
    Record<
        | "selectedModelId"
        | "brand"
        | "model"
        | "vehicleType"
        | "batteryCapacity"
        | "rangeKm"
        | "chargingType"
        | "chargingSpeedKw"
        | "form",
        string
    >
>;

export interface VehicleValidationResult {
    isValid: boolean;
    errors: VehicleValidationErrors;
    helper: {
        range?: string;
    };
    normalized: NormalizedVehiclePayload | null;
    selectedModel: EvModelConfig | null;
}

const isFinitePositive = (value?: number) =>
    typeof value === "number" && Number.isFinite(value) && value > 0;

const trimOrEmpty = (value?: string) => (typeof value === "string" ? value.trim() : "");

export function validateVehicleInput(input: VehicleValidationInput): VehicleValidationResult {
    const errors: VehicleValidationErrors = {};
    const selectedModel = getKnownEvModelById(input.selectedModelId ?? null) ?? null;
    const selectedModelId = selectedModel?.id ?? null;
    const isKnownModel = !!selectedModel;

    const brand = trimOrEmpty(input.brand) || selectedModel?.brand || "";
    const model = trimOrEmpty(input.model) || selectedModel?.model || "";
    const rawVehicleType = trimOrEmpty(input.vehicleType) || selectedModel?.vehicleType || "";
    const chargingType = trimOrEmpty(input.chargingType);

    const batteryCapacity =
        typeof input.batteryCapacity === "number" && Number.isFinite(input.batteryCapacity)
            ? Number(input.batteryCapacity)
            : NaN;
    const rangeKm =
        typeof input.rangeKm === "number" && Number.isFinite(input.rangeKm)
            ? Number(input.rangeKm)
            : NaN;
    const chargingSpeedKw =
        input.chargingSpeedKw === null || input.chargingSpeedKw === undefined
            ? undefined
            : Number(input.chargingSpeedKw);

    if (!brand) errors.brand = "Vehicle brand is required.";
    if (!model) errors.model = "Vehicle model is required.";
    if (!rawVehicleType || !isVehicleType(rawVehicleType)) {
        errors.vehicleType = "Please select a valid vehicle type.";
    }
    if (!isFinitePositive(batteryCapacity)) {
        errors.batteryCapacity = "Battery capacity must be a positive number.";
    }
    if (!isFinitePositive(rangeKm)) {
        errors.rangeKm = "Estimated range must be a positive number.";
    }
    if (!isConnectorType(chargingType)) {
        errors.chargingType = "Please select a valid charging connector type.";
    }

    if (chargingSpeedKw !== undefined) {
        if (!Number.isFinite(chargingSpeedKw) || chargingSpeedKw <= 0) {
            errors.chargingSpeedKw = "Charging speed must be a positive number.";
        } else if (chargingSpeedKw > 600) {
            errors.chargingSpeedKw = "Charging speed looks unrealistic.";
        }
    }

    let helperRangeMessage: string | undefined;
    let supportedConnectors: ConnectorType[] = CONNECTOR_TYPES.slice();

    if (rawVehicleType && isVehicleType(rawVehicleType)) {
        const typeConfig = VEHICLE_TYPE_FALLBACK_CONFIG[rawVehicleType];
        supportedConnectors = typeConfig.supportedConnectors;
    }

    if (isKnownModel && selectedModel) {
        helperRangeMessage = `Suggested range for this model is ${selectedModel.suggestedRange} km.`;
        supportedConnectors = selectedModel.supportedConnectors;

        if (isFinitePositive(rangeKm)) {
            if (rangeKm > selectedModel.maxRange) {
                errors.rangeKm = "Entered range is too high for the selected vehicle model.";
            } else if (rangeKm < selectedModel.minRange) {
                errors.rangeKm = "Entered range is too low for the selected vehicle model.";
            }
        }

        if (isFinitePositive(batteryCapacity)) {
            const minBattery = selectedModel.batteryCapacity * 0.6;
            const maxBattery = selectedModel.batteryCapacity * 1.4;
            if (batteryCapacity < minBattery || batteryCapacity > maxBattery) {
                errors.batteryCapacity = `Battery capacity for this model should usually be between ${Math.round(minBattery)} and ${Math.round(maxBattery)} kWh.`;
            }
        }
    } else if (rawVehicleType && isVehicleType(rawVehicleType)) {
        const typeConfig = VEHICLE_TYPE_FALLBACK_CONFIG[rawVehicleType];
        helperRangeMessage = `Suggested range for this vehicle type is ${typeConfig.suggestedRange} km.`;
        supportedConnectors = typeConfig.supportedConnectors;

        if (isFinitePositive(rangeKm)) {
            if (rangeKm < typeConfig.minRange || rangeKm > typeConfig.maxRange) {
                errors.rangeKm = "Entered range is outside the expected range for this vehicle type.";
            }
        }
        if (isFinitePositive(batteryCapacity)) {
            if (
                batteryCapacity < typeConfig.minBatteryCapacity ||
                batteryCapacity > typeConfig.maxBatteryCapacity
            ) {
                errors.batteryCapacity = `Battery capacity for ${rawVehicleType} is typically between ${typeConfig.minBatteryCapacity} and ${typeConfig.maxBatteryCapacity} kWh.`;
            }
        }
    }

    if (isConnectorType(chargingType) && !supportedConnectors.includes(chargingType)) {
        errors.chargingType = "Selected connector type is not compatible with this vehicle.";
    }

    if (isFinitePositive(batteryCapacity) && isFinitePositive(rangeKm)) {
        const efficiencyKmPerKwh = rangeKm / batteryCapacity;

        if (selectedModel) {
            const expectedEfficiency = selectedModel.suggestedRange / selectedModel.batteryCapacity;
            const minEfficiency = expectedEfficiency * 0.6;
            const maxEfficiency = expectedEfficiency * 1.45;
            if (efficiencyKmPerKwh < minEfficiency || efficiencyKmPerKwh > maxEfficiency) {
                errors.form =
                    "Battery capacity and range combination looks unrealistic for the selected vehicle.";
            }
        } else if (rawVehicleType && isVehicleType(rawVehicleType)) {
            const typeConfig = VEHICLE_TYPE_FALLBACK_CONFIG[rawVehicleType];
            if (
                efficiencyKmPerKwh < typeConfig.minEfficiencyKmPerKwh ||
                efficiencyKmPerKwh > typeConfig.maxEfficiencyKmPerKwh
            ) {
                errors.form =
                    "Battery capacity and range combination looks unrealistic for this vehicle type.";
            }
        }
    }

    if (Object.keys(errors).length > 0) {
        return {
            isValid: false,
            errors,
            helper: { range: helperRangeMessage },
            normalized: null,
            selectedModel,
        };
    }

    if (
        !brand ||
        !model ||
        !rawVehicleType ||
        !isVehicleType(rawVehicleType) ||
        !isFinitePositive(batteryCapacity) ||
        !isFinitePositive(rangeKm) ||
        !isConnectorType(chargingType)
    ) {
        return {
            isValid: false,
            errors: { form: "Vehicle payload is incomplete." },
            helper: { range: helperRangeMessage },
            normalized: null,
            selectedModel,
        };
    }

    const normalized: NormalizedVehiclePayload = {
        selectedModelId,
        brand,
        model,
        vehicleType: rawVehicleType,
        batteryCapacity,
        rangeKm,
        chargingType,
        supportedConnectors,
        isKnownModel,
    };

    if (chargingSpeedKw !== undefined) {
        normalized.chargingSpeedKw = chargingSpeedKw;
    } else if (selectedModel?.optionalChargingSpeed) {
        normalized.chargingSpeedKw = selectedModel.optionalChargingSpeed;
    }

    return {
        isValid: true,
        errors: {},
        helper: { range: helperRangeMessage },
        normalized,
        selectedModel,
    };
}
