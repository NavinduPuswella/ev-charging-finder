import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISlot extends Document {
    _id: mongoose.Types.ObjectId;
    stationId: mongoose.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    status: "AVAILABLE" | "BOOKED";
}

const SlotSchema = new Schema<ISlot>(
    {
        stationId: {
            type: Schema.Types.ObjectId,
            ref: "Station",
            required: true,
        },
        startTime: {
            type: Date,
            required: [true, "Start time is required"],
        },
        endTime: {
            type: Date,
            required: [true, "End time is required"],
        },
        status: {
            type: String,
            enum: ["AVAILABLE", "BOOKED"],
            default: "AVAILABLE",
        },
    },
    {
        timestamps: true,
    }
);

const Slot: Model<ISlot> =
    mongoose.models.Slot || mongoose.model<ISlot>("Slot", SlotSchema);

export default Slot;
