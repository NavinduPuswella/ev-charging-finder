import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    clerkId: string;
    name: string;
    email: string;
    role: "USER" | "STATION_OWNER" | "ADMIN";
    createdAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        clerkId: {
            type: String,
            required: [true, "Clerk ID is required"],
            unique: true,
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            maxlength: [50, "Name cannot exceed 50 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
        },
        role: {
            type: String,
            enum: ["USER", "STATION_OWNER", "ADMIN"],
            default: "USER",
        },
    },
    {
        timestamps: true,
    }
);

const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
