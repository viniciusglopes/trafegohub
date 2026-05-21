import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";
import Campaign from "@/models/Campaign";
import AdSet from "@/models/AdSet";
import Ad from "@/models/Ad";
import { requireAuth } from "@/lib/auth";
import { MetaAdsClient } from "@/lib/meta-ads";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_MAP: Record<string, "active" | "paused" | "deleted" | "archived"> = {
  ACTIVE: "active",
  PAUSED: "paused",
  DELETED: "deleted",
  ARCHIVED: "archived",
};

function extractConversions(insights: any) {
  const conversions =
    insights?.actions?.find(
      (a: any) => a.action_type === "offsite_conversion" || a.action_type === "purchase"
    )?.value || "0";
  const cpa =
    insights?.cost_per_action_type?.find(
      (a: any) => a.action_type === "offsite_conversion" || a.action_type === "purchase"
    )?.value || "0";
  const spend = parseFloat(insights?.spend || "0");
  const conversionsNum = parseInt(conversions, 10);
  const roas = spend > 0 && conversionsNum > 0 ? conversionsNum / spend : 0;
  return { spend, conversionsNum, cpa: parseFloat(cpa), roas };
}

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

    let syncedCampaigns = 0;
    let syncedAdSets = 0;
    let syncedAds = 0;

    for (const campaign of campaigns) {
      let insights = null;
      try {
        insights = await client.getCampaignInsights(campaign.id);
      } catch {}

      const { spend, conversionsNum, cpa, roas } = extractConversions(insights);

      const dbCampaign = await Campaign.findOneAndUpdate(
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
            cpa,
            conversions: conversionsNum,
            roas,
          },
          metricsUpdatedAt: insights ? new Date() : undefined,
        },
        { upsert: true, new: true }
      );
      syncedCampaigns++;

      // Sync ad sets for this campaign
      let adSets: any[] = [];
      try {
        adSets = await client.getAdSets(campaign.id);
      } catch {}

      for (const adSet of adSets) {
        let adSetInsights = null;
        try {
          adSetInsights = await client.getAdSetInsights(adSet.id);
        } catch {}

        const adSetMetrics = extractConversions(adSetInsights);

        const dbAdSet = await AdSet.findOneAndUpdate(
          {
            user: userId,
            adAccount: adAccount._id,
            campaign: dbCampaign._id,
            platformAdSetId: adSet.id,
          } as any,
          {
            user: userId,
            adAccount: adAccount._id,
            campaign: dbCampaign._id,
            platformAdSetId: adSet.id,
            name: adSet.name,
            status: STATUS_MAP[adSet.status] || "paused",
            dailyBudget: adSet.daily_budget
              ? parseInt(adSet.daily_budget, 10) / 100
              : undefined,
            lifetimeBudget: adSet.lifetime_budget
              ? parseInt(adSet.lifetime_budget, 10) / 100
              : undefined,
            targeting: adSet.targeting,
            metrics: {
              spend: adSetMetrics.spend,
              impressions: parseInt(adSetInsights?.impressions || "0", 10),
              clicks: parseInt(adSetInsights?.clicks || "0", 10),
              ctr: parseFloat(adSetInsights?.ctr || "0"),
              cpc: parseFloat(adSetInsights?.cpc || "0"),
              conversions: adSetMetrics.conversionsNum,
            },
            metricsUpdatedAt: adSetInsights ? new Date() : undefined,
          },
          { upsert: true, new: true }
        );
        syncedAdSets++;

        // Sync ads for this ad set
        let ads: any[] = [];
        try {
          ads = await client.getAds(adSet.id);
        } catch {}

        for (const ad of ads) {
          let adInsights = null;
          try {
            adInsights = await client.getAdInsights(ad.id);
          } catch {}

          const adMetrics = extractConversions(adInsights);

          await Ad.findOneAndUpdate(
            {
              user: userId,
              adAccount: adAccount._id,
              platformAdId: ad.id,
            } as any,
            {
              user: userId,
              adAccount: adAccount._id,
              campaign: dbCampaign._id,
              adSet: dbAdSet._id,
              platformAdId: ad.id,
              name: ad.name,
              status: STATUS_MAP[ad.status] || "paused",
              creative: {
                imageUrl: ad.creative?.thumbnail_url,
              },
              metrics: {
                spend: adMetrics.spend,
                impressions: parseInt(adInsights?.impressions || "0", 10),
                clicks: parseInt(adInsights?.clicks || "0", 10),
                ctr: parseFloat(adInsights?.ctr || "0"),
                cpc: parseFloat(adInsights?.cpc || "0"),
                conversions: adMetrics.conversionsNum,
                roas: adMetrics.roas,
              },
              metricsUpdatedAt: adInsights ? new Date() : undefined,
            },
            { upsert: true, new: true }
          );
          syncedAds++;
        }
      }
    }

    await AdAccount.findByIdAndUpdate(adAccount._id, { lastSync: new Date() });

    return NextResponse.json({
      synced: syncedCampaigns,
      adSets: syncedAdSets,
      ads: syncedAds,
    });
  } catch (err: any) {
    console.error("Meta sync error:", err);
    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 }
    );
  }
}
