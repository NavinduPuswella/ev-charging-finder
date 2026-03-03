import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBooking extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    stationId: mongoose.Types.ObjectId;
    slotId: mongoose.Types.ObjectId;
    date: Date;
    duration: number;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    paymentStatus: "PENDING" | "PAID" | "REFUNDED";
    amount: number;
}

const BookingSchema = new Schema<IBooking>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        stationId: {
            type: Schema.Types.ObjectId,
            ref: "Station",
            required: true,
        },
        slotId: {
            type: Schema.Types.ObjectId,
            ref: "Slot",
            required: true,
        },
        date: {
            type: Date,
            required: [true, "Booking date is required"],
        },
        duration: {
            type: Number,
            required: [true, "Duration is required"],
            min: [1, "Duration must be at least 1 hour"],
        },
        status: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
            default: "PENDING",
        },
        paymentStatus: {
            type: String,
            enum: ["PENDING", "PAID", "REFUNDED"],
            default: "PENDING",
        },
        amount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Booking: Model<IBooking> =
    mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
