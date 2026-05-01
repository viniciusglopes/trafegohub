import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";
import Campaign from "@/models/Campaign";
import { requireAuth } from "@/lib/auth";
import { TikTokAdsClient } from "@/lib/tiktok-ads";

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
      platform: "tiktok",
    } as any);

    if (!adAccount) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    const client = new TikTokAdsClient(adAccount.credentials.accessToken);

    switch (action) {
      case "pause":
        await client.updateCampaignStatus(
          adAccount.accountId,
          campaign.platformCampaignId,
          "DISABLE"
        );
        campaign.status = "paused";
        break;

      case "activate":
        await client.updateCampaignStatus(
          adAccount.accountId,
          campaign.platformCampaignId,
          "ENABLE"
        );
        campaign.status = "active";
        break;

      case "updateBudget":
        if (!value?.budget) {
          return NextResponse.json(
            { error: "value.budget is required" },
            { status: 400 }
          );
        }
        await client.updateCampaignBudget(
          adAccount.accountId,
          campaign.platformCampaignId,
          value.budget
        );
        campaign.dailyBudget = value.budget;
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
    console.error("TikTok action error:", err);
    return NextResponse.json(
      { error: err.message || "Action failed" },
      { status: 500 }
    );
  }
}
