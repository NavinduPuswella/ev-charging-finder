import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReview extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    stationId: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
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
        rating: {
            type: Number,
            required: [true, "Rating is required"],
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
        },
        comment: {
            type: String,
            required: [true, "Comment is required"],
            trim: true,
            maxlength: [500, "Comment cannot exceed 500 characters"],
        },
    },
    {
        timestamps: true,
    }
);

const Review: Model<IReview> =
    mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

export default Review;
