import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IRuleCondition {
  metric: "spend" | "cpc" | "cpa" | "ctr" | "roas" | "impressions" | "clicks";
  operator: "gt" | "lt" | "eq" | "gte" | "lte";
  value: number;
}

export interface IRuleAction {
  type: "pause" | "activate" | "alert" | "adjust_budget";
  value?: number;
}

export interface IRule extends Document {
  user: Types.ObjectId;
  name: string;
  active: boolean;
  campaign?: Types.ObjectId;
  adAccount?: Types.ObjectId;
  condition: IRuleCondition;
  action: IRuleAction;
  frequency: "hourly" | "daily" | "weekly";
  lastTriggeredAt?: Date;
  triggerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const RuleSchema = new Schema<IRule>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    campaign: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
    },
    adAccount: {
      type: Schema.Types.ObjectId,
      ref: "AdAccount",
    },
    condition: {
      metric: {
        type: String,
        enum: ["spend", "cpc", "cpa", "ctr", "roas", "impressions", "clicks"],
        required: true,
      },
      operator: {
        type: String,
        enum: ["gt", "lt", "eq", "gte", "lte"],
        required: true,
      },
      value: {
        type: Number,
        required: true,
      },
    },
    action: {
      type: {
        type: String,
        enum: ["pause", "activate", "alert", "adjust_budget"],
        required: true,
      },
      value: {
        type: Number,
      },
    },
    frequency: {
      type: String,
      enum: ["hourly", "daily", "weekly"],
      default: "daily",
    },
    lastTriggeredAt: {
      type: Date,
    },
    triggerCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

RuleSchema.index({ user: 1, active: 1 });

const Rule: Model<IRule> =
  mongoose.models.Rule || mongoose.model<IRule>("Rule", RuleSchema);

export default Rule;
