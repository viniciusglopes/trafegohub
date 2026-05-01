import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Campaign from "@/models/Campaign";
import { requireAuth } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const userId = (session!.user as any).id;

    const campaign = await Campaign.findOne({ _id: id, user: userId } as any)
      .populate("adAccount", "platform accountName accountId")
      .lean();

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Get campaign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const userId = (session!.user as any).id;
    const body = await request.json();

    const allowedFields = [
      "name",
      "status",
      "objective",
      "dailyBudget",
      "lifetimeBudget",
      "metrics",
      "metricsUpdatedAt",
      "startDate",
      "endDate",
    ];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, user: userId } as any,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("adAccount", "platform accountName accountId")
      .lean();

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Update campaign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const userId = (session!.user as any).id;
    const body = await request.json();

    const { action } = body;

    const campaign = await Campaign.findOne({ _id: id, user: userId } as any);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "pause":
        campaign.status = "paused";
        break;
      case "activate":
        campaign.status = "active";
        break;
      case "updateBudget":
        if (body.dailyBudget !== undefined) {
          campaign.dailyBudget = body.dailyBudget;
        }
        if (body.lifetimeBudget !== undefined) {
          campaign.lifetimeBudget = body.lifetimeBudget;
        }
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: pause, activate, updateBudget" },
          { status: 400 }
        );
    }

    await campaign.save();

    const updated = await Campaign.findById(campaign._id)
      .populate("adAccount", "platform accountName accountId")
      .lean();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Patch campaign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
