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
    pricePerKwh: number;
    rating: number;
    isApproved: boolean;
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
            required: [true, "Total slots is required"],
            min: [1, "At least 1 slot is required"],
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

const Station: Model<IStation> =
    mongoose.models.Station || mongoose.model<IStation>("Station", StationSchema);

export default Station;
