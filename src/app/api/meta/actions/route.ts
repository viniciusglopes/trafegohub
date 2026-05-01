import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";
import Campaign from "@/models/Campaign";
import { requireAuth } from "@/lib/auth";
import { MetaAdsClient } from "@/lib/meta-ads";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as any).id;
    const body = await request.json();
    const { campaignId, action, value } = body;

    if (!campaignId || !action) {
      return NextResponse.json(
        { error: "campaignId and action are required" },
        { status: 400 }
      );
    }

    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: userId,
    } as any);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const adAccount = await AdAccount.findOne({
      _id: campaign.adAccount,
      user: userId,
    } as any);

    if (!adAccount) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    const client = new MetaAdsClient(adAccount.credentials.accessToken);

    switch (action) {
      case "pause":
        await client.updateCampaignStatus(campaign.platformCampaignId, "PAUSED");
        campaign.status = "paused";
        break;

      case "activate":
        await client.updateCampaignStatus(campaign.platformCampaignId, "ACTIVE");
        campaign.status = "active";
        break;

      case "updateBudget":
        if (!value || (!value.dailyBudget && !value.lifetimeBudget)) {
          return NextResponse.json(
            { error: "value.dailyBudget or value.lifetimeBudget is required" },
            { status: 400 }
          );
        }
        await client.updateCampaignBudget(
          campaign.platformCampaignId,
          value.dailyBudget,
          value.lifetimeBudget
        );
        if (value.dailyBudget !== undefined) {
          campaign.dailyBudget = value.dailyBudget;
        }
        if (value.lifetimeBudget !== undefined) {
          campaign.lifetimeBudget = value.lifetimeBudget;
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
  } catch (err: any) {
    console.error("Meta action error:", err);
    return NextResponse.json(
      { error: err.message || "Action failed" },
      { status: 500 }
    );
  }
}
