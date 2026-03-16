import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStation extends Document {
    _id: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    name: string;
    location: {
        latitude: number;
        longitude: number;
    };
    city: string;
    chargerType: "Type1" | "Type2" | "CCS" | "CHAdeMO" | "Tesla";
    totalSlots: number;
    totalChargingPoints: number;
    pricePerKwh: number;
    rating: number;
    isApproved: boolean;
    status: "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE";
    address?: string;
    description?: string;
}

const StationSchema = new Schema<IStation>(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        name: {
            type: String,
            required: [true, "Station name is required"],
            trim: true,
        },
        location: {
            latitude: {
                type: Number,
                required: [true, "Latitude is required"],
            },
            longitude: {
                type: Number,
                required: [true, "Longitude is required"],
            },
        },
        city: {
            type: String,
            required: [true, "City is required"],
            trim: true,
        },
        chargerType: {
            type: String,
            enum: ["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"],
            required: [true, "Charger type is required"],
        },
        totalSlots: {
            type: Number,
            min: [1, "At least 1 charging point is required"],
        },
        totalChargingPoints: {
            type: Number,
            required: [true, "Total charging points is required"],
            min: [1, "At least 1 charging point is required"],
        },
        pricePerKwh: {
            type: Number,
            required: [true, "Price per kWh is required"],
            min: [0, "Price cannot be negative"],
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["AVAILABLE", "LIMITED", "MAINTENANCE", "INACTIVE"],
            default: "AVAILABLE",
        },
        address: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

StationSchema.pre("validate", function () {
    if (!this.totalChargingPoints && this.totalSlots) {
        this.totalChargingPoints = this.totalSlots;
    }

    if (!this.totalSlots && this.totalChargingPoints) {
        this.totalSlots = this.totalChargingPoints;
    }
});

const Station: Model<IStation> =
    mongoose.models.Station || mongoose.model<IStation>("Station", StationSchema);

export default Station;
