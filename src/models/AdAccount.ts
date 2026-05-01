import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAdAccountCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface IAdAccount extends Document {
  user: Types.ObjectId;
  platform: "meta" | "google" | "tiktok";
  accountId: string;
  accountName: string;
  credentials: IAdAccountCredentials;
  status: "connected" | "expired" | "error";
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdAccountSchema = new Schema<IAdAccount>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["meta", "google", "tiktok"],
      required: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    credentials: {
      accessToken: { type: String },
      refreshToken: { type: String },
      expiresAt: { type: Date },
    },
    status: {
      type: String,
      enum: ["connected", "expired", "error"],
      default: "connected",
    },
    lastSync: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

AdAccountSchema.index({ user: 1, platform: 1 });

const AdAccount: Model<IAdAccount> =
  mongoose.models.AdAccount ||
  mongoose.model<IAdAccount>("AdAccount", AdAccountSchema);

export default AdAccount;
