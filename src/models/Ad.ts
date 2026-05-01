import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAd extends Document {
  user: Types.ObjectId;
  adAccount: Types.ObjectId;
  campaign: Types.ObjectId;
  adSet: Types.ObjectId;
  platformAdId: string;
  name: string;
  status: "active" | "paused" | "deleted" | "archived";
  creative?: {
    title?: string;
    body?: string;
    imageUrl?: string;
    videoUrl?: string;
    linkUrl?: string;
    callToAction?: string;
  };
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    conversions: number;
    roas: number;
  };
  metricsUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdSchema = new Schema<IAd>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adAccount: { type: Schema.Types.ObjectId, ref: "AdAccount", required: true },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    adSet: { type: Schema.Types.ObjectId, ref: "AdSet", required: true, index: true },
    platformAdId: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ["active", "paused", "deleted", "archived"], default: "active" },
    creative: {
      title: String,
      body: String,
      imageUrl: String,
      videoUrl: String,
      linkUrl: String,
      callToAction: String,
    },
    metrics: {
      spend: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      cpc: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      roas: { type: Number, default: 0 },
    },
    metricsUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

AdSchema.index({ user: 1, adSet: 1 });

const Ad: Model<IAd> =
  mongoose.models.Ad || mongoose.model<IAd>("Ad", AdSchema);

export default Ad;
