import mongoose, { Schema, Model } from "mongoose";

export interface IVehicle {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    model: string;
    batteryCapacity: number;
    rangeKm: number;
    chargingType: "Type1" | "Type2" | "CCS" | "CHAdeMO" | "Tesla";
}

const VehicleSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        model: {
            type: String,
            required: [true, "Vehicle model is required"],
            trim: true,
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
            enum: ["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"],
            required: [true, "Charging type is required"],
        },
    },
    {
        timestamps: true,
    }
);

const Vehicle: Model<IVehicle> =
    mongoose.models.Vehicle || mongoose.model<IVehicle>("Vehicle", VehicleSchema);

export default Vehicle;
