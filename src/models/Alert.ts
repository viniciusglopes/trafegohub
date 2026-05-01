import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAlert extends Document {
  user: Types.ObjectId;
  campaign?: Types.ObjectId;
  adAccount?: Types.ObjectId;
  type: "budget_exceeded" | "low_performance" | "campaign_paused" | "account_error" | "high_cpa" | "low_roas" | "custom";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign" },
    adAccount: { type: Schema.Types.ObjectId, ref: "AdAccount" },
    type: {
      type: String,
      enum: ["budget_exceeded", "low_performance", "campaign_paused", "account_error", "high_cpa", "low_roas", "custom"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Alert: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>("Alert", AlertSchema);

export default Alert;
