import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Rule from "@/models/Rule";
import { requireAuth } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as any).id;

    const rules = await Rule.find({ user: userId })
      .populate("campaign", "name status")
      .populate("adAccount", "platform accountName")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(rules);
  } catch (err) {
    console.error("List rules error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as any).id;
    const body = await request.json();

    const { name, campaign, adAccount, condition, action, frequency } = body;

    if (!name || !condition || !action) {
      return NextResponse.json(
        { error: "name, condition, and action are required" },
        { status: 400 }
      );
    }

    const validMetrics = [
      "spend",
      "cpc",
      "cpa",
      "ctr",
      "roas",
      "impressions",
      "clicks",
    ];
    const validOperators = ["gt", "lt", "eq", "gte", "lte"];
    const validActions = ["pause", "activate", "alert", "adjust_budget"];
    const validFrequencies = ["hourly", "daily", "weekly"];

    if (!validMetrics.includes(condition.metric)) {
      return NextResponse.json(
        { error: `Invalid metric. Use: ${validMetrics.join(", ")}` },
        { status: 400 }
      );
    }

    if (!validOperators.includes(condition.operator)) {
      return NextResponse.json(
        { error: `Invalid operator. Use: ${validOperators.join(", ")}` },
        { status: 400 }
      );
    }

    if (typeof condition.value !== "number") {
      return NextResponse.json(
        { error: "condition.value must be a number" },
        { status: 400 }
      );
    }

    if (!validActions.includes(action.type)) {
      return NextResponse.json(
        { error: `Invalid action type. Use: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `Invalid frequency. Use: ${validFrequencies.join(", ")}` },
        { status: 400 }
      );
    }

    const rule = await Rule.create({
      user: userId,
      name,
      campaign: campaign || undefined,
      adAccount: adAccount || undefined,
      condition,
      action,
      frequency: frequency || "daily",
      active: true,
      triggerCount: 0,
    });

    const populated = await Rule.findById(rule._id)
      .populate("campaign", "name status")
      .populate("adAccount", "platform accountName")
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (err) {
    console.error("Create rule error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
