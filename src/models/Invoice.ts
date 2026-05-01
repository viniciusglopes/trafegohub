import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IInvoice extends Document {
  user: Types.ObjectId;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  paidAt?: Date;
  dueDate?: Date;
  planAtTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    stripeInvoiceId: {
      type: String,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "brl",
    },
    status: {
      type: String,
      enum: ["paid", "pending", "failed"],
      default: "pending",
    },
    paidAt: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    planAtTime: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice ||
  mongoose.model<IInvoice>("Invoice", InvoiceSchema);

export default Invoice;
