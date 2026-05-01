import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";
import Campaign from "@/models/Campaign";
import { requireAuth } from "@/lib/auth";
import { GoogleAdsClient } from "@/lib/google-ads";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_MAP: Record<string, "active" | "paused" | "deleted"> = {
  ENABLED: "active",
  PAUSED: "paused",
  REMOVED: "deleted",
};

async function refreshAccessToken(adAccount: any): Promise<string> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret ||
    !adAccount.credentials.refreshToken
  ) {
    throw new Error("Cannot refresh token: missing credentials");
  }

  if (adAccount.credentials.expiresAt > new Date()) {
    return adAccount.credentials.accessToken;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: adAccount.credentials.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    await AdAccount.findByIdAndUpdate(adAccount._id, { status: "expired" });
    throw new Error("Failed to refresh Google access token");
  }

  await AdAccount.findByIdAndUpdate(adAccount._id, {
    "credentials.accessToken": data.access_token,
    "credentials.expiresAt": new Date(
      Date.now() + (data.expires_in || 3600) * 1000
    ),
    status: "connected",
  });

  return data.access_token;
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
      platform: "google",
    } as any);

    if (!adAccount) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!developerToken) {
      return NextResponse.json(
        { error: "Google Ads developer token not configured" },
        { status: 500 }
      );
    }

    const accessToken = await refreshAccessToken(adAccount);
    const client = new GoogleAdsClient(
      accessToken,
      developerToken,
      adAccount.accountId
    );

    const campaigns = await client.listCampaigns();

    let synced = 0;

    for (const row of campaigns) {
      const costReais = parseInt(row.metrics.costMicros || "0", 10) / 1_000_000;
      const cpcReais = (row.metrics.averageCpc || 0) / 1_000_000;
      const conversions = row.metrics.conversions || 0;
      const cpa = conversions > 0 ? costReais / conversions : 0;
      const roas = costReais > 0 && conversions > 0 ? conversions / costReais : 0;

      await Campaign.findOneAndUpdate(
        {
          user: userId,
          adAccount: adAccount._id,
          platformCampaignId: row.campaign.id,
        } as any,
        {
          user: userId,
          adAccount: adAccount._id,
          platformCampaignId: row.campaign.id,
          name: row.campaign.name,
          status: STATUS_MAP[row.campaign.status] || "paused",
          dailyBudget: undefined,
          metrics: {
            spend: costReais,
            impressions: parseInt(row.metrics.impressions || "0", 10),
            clicks: parseInt(row.metrics.clicks || "0", 10),
            ctr: (row.metrics.ctr || 0) * 100,
            cpc: cpcReais,
            cpa,
            conversions,
            roas,
          },
          metricsUpdatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      synced++;
    }

    await AdAccount.findByIdAndUpdate(adAccount._id, { lastSync: new Date() });

    return NextResponse.json({ synced });
  } catch (err: any) {
    console.error("Google Ads sync error:", err);
    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 }
    );
  }
}
