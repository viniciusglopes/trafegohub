import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";
import Campaign from "@/models/Campaign";
import { requireAuth } from "@/lib/auth";
import { MetaAdsClient } from "@/lib/meta-ads";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_MAP: Record<string, "active" | "paused" | "deleted" | "archived"> = {
  ACTIVE: "active",
  PAUSED: "paused",
  DELETED: "deleted",
  ARCHIVED: "archived",
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
      platform: "meta",
    } as any);

    if (!adAccount) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    const client = new MetaAdsClient(adAccount.credentials.accessToken);

    const campaigns = await client.getCampaigns(adAccount.accountId);

    let synced = 0;

    for (const campaign of campaigns) {
      let insights = null;
      try {
        insights = await client.getCampaignInsights(campaign.id);
      } catch {
      }

      const conversions =
        insights?.actions?.find(
          (a) => a.action_type === "offsite_conversion" || a.action_type === "purchase"
        )?.value || "0";

      const cpa =
        insights?.cost_per_action_type?.find(
          (a) => a.action_type === "offsite_conversion" || a.action_type === "purchase"
        )?.value || "0";

      const spend = parseFloat(insights?.spend || "0");
      const conversionsNum = parseInt(conversions, 10);
      const roas = spend > 0 && conversionsNum > 0 ? conversionsNum / spend : 0;

      await Campaign.findOneAndUpdate(
        {
          user: userId,
          adAccount: adAccount._id,
          platformCampaignId: campaign.id,
        } as any,
        {
          user: userId,
          adAccount: adAccount._id,
          platformCampaignId: campaign.id,
          name: campaign.name,
          status: STATUS_MAP[campaign.status] || "paused",
          objective: campaign.objective,
          dailyBudget: campaign.daily_budget
            ? parseInt(campaign.daily_budget, 10) / 100
            : undefined,
          lifetimeBudget: campaign.lifetime_budget
            ? parseInt(campaign.lifetime_budget, 10) / 100
            : undefined,
          startDate: campaign.start_time
            ? new Date(campaign.start_time)
            : undefined,
          endDate: campaign.stop_time
            ? new Date(campaign.stop_time)
            : undefined,
          metrics: {
            spend,
            impressions: parseInt(insights?.impressions || "0", 10),
            clicks: parseInt(insights?.clicks || "0", 10),
            ctr: parseFloat(insights?.ctr || "0"),
            cpc: parseFloat(insights?.cpc || "0"),
            cpa: parseFloat(cpa),
            conversions: conversionsNum,
            roas,
          },
          metricsUpdatedAt: insights ? new Date() : undefined,
        },
        { upsert: true, new: true }
      );

      synced++;
    }

    await AdAccount.findByIdAndUpdate(adAccount._id, { lastSync: new Date() });

    return NextResponse.json({ synced });
  } catch (err: any) {
    console.error("Meta sync error:", err);
    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 }
    );
  }
}
