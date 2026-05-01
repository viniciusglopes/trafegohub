import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Ad from "@/models/Ad";
import AdSet from "@/models/AdSet";
import AdAccount from "@/models/AdAccount";
import Campaign from "@/models/Campaign";
import { requireAuth } from "@/lib/auth";
import { MetaAdsClient } from "@/lib/meta-ads";
import { GoogleAdsClient } from "@/lib/google-ads";
import { TikTokAdsClient } from "@/lib/tiktok-ads";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as any).id;
    const searchParams = request.nextUrl.searchParams;
    const campaignParam = searchParams.get("campaign");
    const adAccountParam = searchParams.get("adAccount");
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");

    const filter: Record<string, any> = { user: userId };

    if (campaignParam) {
      filter.campaign = campaignParam;
    }

    if (adAccountParam) {
      filter.adAccount = adAccountParam;
    }

    if (status) {
      filter.status = status;
    }

    if (platform) {
      const accounts = await AdAccount.find({ user: userId, platform } as any)
        .select("_id")
        .lean();

      const accountIds = accounts.map((a) => a._id);
      filter.adAccount = { $in: accountIds };
    }

    const ads = await Ad.find(filter)
      .populate("adSet", "name platformAdSetId")
      .populate("campaign", "name platformCampaignId")
      .populate("adAccount", "platform accountName accountId")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(ads);
  } catch (err) {
    console.error("List ads error:", err);
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

    const {
      adAccountId,
      campaignId,
      adSetId,
      name,
      creative,
      platform: explicitPlatform,
    } = body;

    if (!adAccountId || !campaignId || !adSetId || !name) {
      return NextResponse.json(
        { error: "adAccountId, campaignId, adSetId, and name are required" },
        { status: 400 }
      );
    }

    const adAccount = await AdAccount.findOne({
      _id: adAccountId,
      user: userId,
    } as any);
    if (!adAccount) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
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

    const adSet = await AdSet.findOne({
      _id: adSetId,
      user: userId,
    } as any);
    if (!adSet) {
      return NextResponse.json(
        { error: "Ad set not found" },
        { status: 404 }
      );
    }

    const platform = explicitPlatform || adAccount.platform;
    let platformAdId = "";

    try {
      if (platform === "meta") {
        if (!adAccount.credentials?.accessToken) {
          throw new Error("Meta credentials not configured");
        }
        const client = new MetaAdsClient(adAccount.credentials.accessToken);

        let imageHash: string | undefined;
        if (creative?.imageUrl) {
          const imgResult = await client.uploadImage(
            adAccount.accountId,
            creative.imageUrl
          );
          imageHash = imgResult.hash;
        }

        const creativeResult = await client.createCreative(
          adAccount.accountId,
          {
            imageHash: imageHash || "",
            title: creative?.title || name,
            body: creative?.body || "",
            linkUrl: creative?.linkUrl || "",
          }
        );

        const adResult = await client.createAd(
          adSet.platformAdSetId,
          creativeResult.id,
          name,
          "PAUSED"
        );

        platformAdId = adResult.id;
      } else if (platform === "google") {
        if (!adAccount.credentials?.accessToken) {
          throw new Error("Google credentials not configured");
        }
        const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";
        const client = new GoogleAdsClient(
          adAccount.credentials.accessToken,
          devToken,
          adAccount.accountId
        );

        const result = await client.createAd(adAccount.accountId, adSet.platformAdSetId, {
          headlines: [creative?.title || name],
          descriptions: [creative?.body || ""],
          finalUrls: creative?.linkUrl ? [creative.linkUrl] : [],
          name,
        });

        platformAdId = result.results?.[0]?.resourceName || `google_ad_${Date.now()}`;
      } else if (platform === "tiktok") {
        if (!adAccount.credentials?.accessToken) {
          throw new Error("TikTok credentials not configured");
        }
        const client = new TikTokAdsClient(adAccount.credentials.accessToken);

        let imageId: string | undefined;
        if (creative?.imageUrl) {
          const imgResult = await client.uploadImage(
            adAccount.accountId,
            creative.imageUrl
          );
          imageId = imgResult.imageId;
        }

        const result = await client.createAd(
          adAccount.accountId,
          adSet.platformAdSetId,
          {
            adName: name,
            imageId,
            title: creative?.title,
            description: creative?.body,
            landingPageUrl: creative?.linkUrl,
          }
        );

        platformAdId = result.adId;
      } else {
        return NextResponse.json(
          { error: `Unsupported platform: ${platform}` },
          { status: 400 }
        );
      }
    } catch (platformErr: any) {
      console.error(`Platform ad creation error (${platform}):`, platformErr);
      // Save with a placeholder ID so user can see it was attempted
      platformAdId = `pending_${platform}_${Date.now()}`;
    }

    const ad = await Ad.create({
      user: userId,
      adAccount: adAccountId,
      campaign: campaignId,
      adSet: adSetId,
      platformAdId,
      name,
      status: "paused",
      creative: {
        title: creative?.title,
        body: creative?.body,
        imageUrl: creative?.imageUrl,
        linkUrl: creative?.linkUrl,
      },
      metrics: {
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
        roas: 0,
      },
    });

    const populated = await Ad.findById(ad._id)
      .populate("adSet", "name platformAdSetId")
      .populate("campaign", "name platformCampaignId")
      .populate("adAccount", "platform accountName accountId")
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (err) {
    console.error("Create ad error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
