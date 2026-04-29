import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBooking extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    stationId: mongoose.Types.ObjectId;
    stationName: string;
    city: string;
    bookingDate: string;
    startTime: Date;
    endTime: Date;
    durationHours: number;
    chargerType: string;
    /** Snapshot of the station's charging rate (LKR per kWh) at booking time. */
    pricePerKwh: number;
    /** Snapshot of the station's per-hour reservation fee at booking time. */
    reservationFeePerHour: number;
    /** Calculated: durationHours × reservationFeePerHour */
    totalReservationFee: number;
    status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    paymentStatus: "PENDING" | "PAID" | "REFUNDED";
    /**
     * Total reservation fee paid online (LKR), kept in sync with
     * totalReservationFee for backward compatibility with analytics.
     */
    amount: number;
    createdAt: Date;
    updatedAt: Date;
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
        stationName: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: [true, "City is required"],
        },
        bookingDate: {
            type: String,
            required: [true, "Booking date is required"],
        },
        startTime: {
            type: Date,
            required: [true, "Start time is required"],
        },
        endTime: {
            type: Date,
            required: [true, "End time is required"],
        },
        durationHours: {
            type: Number,
            required: [true, "Duration is required"],
            min: [1, "Duration must be at least 1 hour"],
            max: [5, "Maximum booking duration is 5 hours"],
        },
        chargerType: {
            type: String,
            required: [true, "Charger type is required"],
        },
        pricePerKwh: {
            type: Number,
            required: [true, "Price per kWh is required"],
            min: [0, "Price cannot be negative"],
        },
        reservationFeePerHour: {
            type: Number,
            required: [true, "Reservation fee per hour is required"],
            min: [0, "Reservation fee cannot be negative"],
        },
        totalReservationFee: {
            type: Number,
            required: [true, "Total reservation fee is required"],
            min: [0, "Total reservation fee cannot be negative"],
        },
        status: {
            type: String,
            enum: ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "COMPLETED"],
            default: "PENDING_PAYMENT",
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

BookingSchema.index({ stationId: 1, startTime: 1, endTime: 1, status: 1 });

const Booking: Model<IBooking> =
    mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
