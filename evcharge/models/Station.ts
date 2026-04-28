import mongoose, { Schema, Document, Model } from "mongoose";
import {
    DESCRIPTION_WORD_ERROR,
    MAX_DESCRIPTION_WORDS,
    countWords,
} from "@/lib/station-description";

export type StationSource = "admin" | "owner_submission" | "guest_submission";
export type RequesterAccountStatus =
    | "Registered User"
    | "Guest / No Account"
    | "Admin Added";
export type StationStatus = "AVAILABLE" | "LIMITED" | "MAINTENANCE" | "INACTIVE";

export interface IStation extends Document {
    _id: mongoose.Types.ObjectId;
    ownerId?: mongoose.Types.ObjectId;
    name: string;
    stationName?: string;
    location: {
        latitude: number;
        longitude: number;
    };
    city: string;
    chargerType: string;
    chargerTypes?: string;
    totalSlots: number;
    totalChargingPoints: number;
    /**
     * The station's electricity charging rate (LKR per kWh).
     * Surfaced to the UI as "Charging Rate". This is paid by the driver
     * directly at the station based on energy consumed.
     */
    pricePerKwh: number;
    chargingRatePerKwh?: number;
    /** Per-hour reservation/booking fee (LKR). Each station sets its own. */
    reservationFeePerHour: number;
    rating: number;
    isApproved: boolean;
    status: StationStatus;
    address?: string;
    description?: string;
    contactPhone?: string;
    submitterName?: string;
    submitterEmail?: string;
    submittedAt?: Date;
    approvedAt?: Date;
    source?: StationSource;
    requesterName?: string;
    requesterEmail?: string;
    requesterPhone?: string;
    requesterUserId?: mongoose.Types.ObjectId;
    requesterAccountStatus?: RequesterAccountStatus;
    createdAt?: Date;
    updatedAt?: Date;
}

const StationSchema = new Schema<IStation>(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        name: {
            type: String,
            required: [true, "Station name is required"],
            trim: true,
            alias: "stationName",
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
            required: [true, "At least one charger type is required"],
            trim: true,
            alias: "chargerTypes",
            validate: {
                validator: (value: string) => {
                    const validTypes = ["Type1", "Type2", "CCS", "CHAdeMO", "Tesla"];
                    const types = value
                        .split(",")
                        .map((type) => type.trim())
                        .filter(Boolean);
                    return types.length > 0 && types.every((type) => validTypes.includes(type));
                },
                message: "Invalid charger type selection",
            },
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
            alias: "chargingRatePerKwh",
        },
        reservationFeePerHour: {
            type: Number,
            default: 100,
            min: [0, "Reservation fee cannot be negative"],
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
            validate: {
                validator: (value: string | undefined | null) => {
                    if (!value) return true;
                    return countWords(value) <= MAX_DESCRIPTION_WORDS;
                },
                message: DESCRIPTION_WORD_ERROR,
            },
        },
        contactPhone: {
            type: String,
            trim: true,
        },
        submitterName: {
            type: String,
            trim: true,
        },
        submitterEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        submittedAt: {
            type: Date,
        },
        approvedAt: {
            type: Date,
        },
        source: {
            type: String,
            enum: ["admin", "owner_submission", "guest_submission"],
            default: "admin",
        },
        requesterName: {
            type: String,
            trim: true,
        },
        requesterEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        requesterPhone: {
            type: String,
            trim: true,
        },
        requesterUserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        requesterAccountStatus: {
            type: String,
            enum: ["Registered User", "Guest / No Account", "Admin Added"],
            default: "Admin Added",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

StationSchema.pre("validate", function () {
    if (!this.totalChargingPoints && this.totalSlots) {
        this.totalChargingPoints = this.totalSlots;
    }

    if (!this.totalSlots && this.totalChargingPoints) {
        this.totalSlots = this.totalChargingPoints;
    }

    if (!this.requesterName && this.submitterName) {
        this.requesterName = this.submitterName;
    }

    if (!this.requesterEmail && this.submitterEmail) {
        this.requesterEmail = this.submitterEmail;
    }

    if (!this.requesterPhone && this.contactPhone) {
        this.requesterPhone = this.contactPhone;
    }
});

if (mongoose.models.Station) {
    mongoose.deleteModel("Station");
}
const Station: Model<IStation> = mongoose.model<IStation>("Station", StationSchema);

export default Station;
