import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";
import Campaign from "@/models/Campaign";
import { requireAuth } from "@/lib/auth";
import { TikTokAdsClient } from "@/lib/tiktok-ads";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_MAP: Record<string, "active" | "paused" | "deleted"> = {
  ENABLE: "active",
  DISABLE: "paused",
  DELETE: "deleted",
};

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as any).id;
    const body = await request.json();
    const { adAccountId } = body;

    if (!adAccountId) {
      return NextResponse.json(
        { error: "adAccountId is required" },
        { status: 400 }
      );
    }

    const adAccount = await AdAccount.findOne({
      _id: adAccountId,
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
    const campaigns = await client.getCampaigns(adAccount.accountId);

    const campaignIds = campaigns.map((c) => c.campaign_id);

    let metricsMap = new Map<
      string,
      {
        spend: string;
        impressions: string;
        clicks: string;
        ctr: string;
        cpc: string;
        conversion: string;
        cost_per_conversion: string;
      }
    >();

    if (campaignIds.length > 0) {
      try {
        metricsMap = await client.getCampaignMetrics(
          adAccount.accountId,
          campaignIds
        );
      } catch {
      }
    }

    let synced = 0;

    for (const campaign of campaigns) {
      const metrics = metricsMap.get(campaign.campaign_id);

      const spend = parseFloat(metrics?.spend || "0");
      const conversions = parseInt(metrics?.conversion || "0", 10);
      const roas = spend > 0 && conversions > 0 ? conversions / spend : 0;

      const budgetField =
        campaign.budget_mode === "BUDGET_MODE_DAY"
          ? { dailyBudget: campaign.budget }
          : { lifetimeBudget: campaign.budget };

      await Campaign.findOneAndUpdate(
        {
          user: userId,
          adAccount: adAccount._id,
          platformCampaignId: campaign.campaign_id,
        } as any,
        {
          user: userId,
          adAccount: adAccount._id,
          platformCampaignId: campaign.campaign_id,
          name: campaign.campaign_name,
          status: STATUS_MAP[campaign.operation_status] || "paused",
          objective: campaign.objective_type,
          ...budgetField,
          metrics: {
            spend,
            impressions: parseInt(metrics?.impressions || "0", 10),
            clicks: parseInt(metrics?.clicks || "0", 10),
            ctr: parseFloat(metrics?.ctr || "0"),
            cpc: parseFloat(metrics?.cpc || "0"),
            cpa: parseFloat(metrics?.cost_per_conversion || "0"),
            conversions,
            roas,
          },
          metricsUpdatedAt: metrics ? new Date() : undefined,
        },
        { upsert: true, new: true }
      );

      synced++;
    }

    await AdAccount.findByIdAndUpdate(adAccount._id, { lastSync: new Date() });

    return NextResponse.json({ synced });
  } catch (err: any) {
    console.error("TikTok sync error:", err);
    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 }
    );
  }
}
