import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICampaignMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpa: number;
  conversions: number;
  roas: number;
}

export interface ICampaign extends Document {
  user: Types.ObjectId;
  adAccount: Types.ObjectId;
  platformCampaignId: string;
  name: string;
  status: "active" | "paused" | "deleted" | "archived";
  objective?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  metrics: ICampaignMetrics;
  metricsUpdatedAt?: Date;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adAccount: {
      type: Schema.Types.ObjectId,
      ref: "AdAccount",
      required: true,
      index: true,
    },
    platformCampaignId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "deleted", "archived"],
      default: "active",
    },
    objective: {
      type: String,
    },
    dailyBudget: {
      type: Number,
    },
    lifetimeBudget: {
      type: Number,
    },
    metrics: {
      spend: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      cpc: { type: Number, default: 0 },
      cpa: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      roas: { type: Number, default: 0 },
    },
    metricsUpdatedAt: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Campaign: Model<ICampaign> =
  mongoose.models.Campaign ||
  mongoose.model<ICampaign>("Campaign", CampaignSchema);

export default Campaign;
