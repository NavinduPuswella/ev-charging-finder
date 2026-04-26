import mongoose, { Schema, Model } from "mongoose";
import { CONNECTOR_TYPES, VEHICLE_TYPES, type ConnectorType, type VehicleType } from "@/lib/ev-config";

export interface IVehicle {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    selectedModelId?: string | null;
    brand: string;
    model: string;
    vehicleType: VehicleType;
    batteryCapacity: number;
    rangeKm: number;
    chargingType: ConnectorType;
    chargingSpeedKw?: number;
    supportedConnectors: ConnectorType[];
    isKnownModel: boolean;
    isPrimary: boolean;
}

const VehicleSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        selectedModelId: {
            type: String,
            default: null,
            trim: true,
        },
        brand: {
            type: String,
            required: [true, "Vehicle brand is required"],
            trim: true,
        },
        model: {
            type: String,
            required: [true, "Vehicle model is required"],
            trim: true,
        },
        vehicleType: {
            type: String,
            enum: VEHICLE_TYPES,
            required: [true, "Vehicle type is required"],
        },
        batteryCapacity: {
            type: Number,
            required: [true, "Battery capacity is required"],
            min: [1, "Battery capacity must be positive"],
        },
        rangeKm: {
            type: Number,
            required: [true, "Range is required"],
            min: [1, "Range must be positive"],
        },
        chargingType: {
            type: String,
            enum: CONNECTOR_TYPES,
            required: [true, "Charging type is required"],
        },
        chargingSpeedKw: {
            type: Number,
            min: [1, "Charging speed must be positive"],
        },
        supportedConnectors: {
            type: [String],
            enum: CONNECTOR_TYPES,
            default: [],
        },
        isKnownModel: {
            type: Boolean,
            default: false,
        },
        isPrimary: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Vehicle: Model<IVehicle> =
    mongoose.models.Vehicle || mongoose.model<IVehicle>("Vehicle", VehicleSchema);

export default Vehicle;
