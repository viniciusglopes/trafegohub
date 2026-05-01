import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAdSet extends Document {
  user: Types.ObjectId;
  adAccount: Types.ObjectId;
  campaign: Types.ObjectId;
  platformAdSetId: string;
  name: string;
  status: "active" | "paused" | "deleted" | "archived";
  dailyBudget?: number;
  lifetimeBudget?: number;
  targeting?: Record<string, unknown>;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    conversions: number;
  };
  metricsUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdSetSchema = new Schema<IAdSet>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adAccount: { type: Schema.Types.ObjectId, ref: "AdAccount", required: true },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    platformAdSetId: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ["active", "paused", "deleted", "archived"], default: "active" },
    dailyBudget: { type: Number },
    lifetimeBudget: { type: Number },
    targeting: { type: Schema.Types.Mixed },
    metrics: {
      spend: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      cpc: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
    },
    metricsUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

AdSetSchema.index({ user: 1, campaign: 1 });

const AdSet: Model<IAdSet> =
  mongoose.models.AdSet || mongoose.model<IAdSet>("AdSet", AdSetSchema);

export default AdSet;
