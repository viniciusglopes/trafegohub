import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Ad from "@/models/Ad";
import AdAccount from "@/models/AdAccount";
import AdSet from "@/models/AdSet";
import { requireAuth } from "@/lib/auth";
import { MetaAdsClient } from "@/lib/meta-ads";
import { GoogleAdsClient } from "@/lib/google-ads";
import { TikTokAdsClient } from "@/lib/tiktok-ads";

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

    const ad = await Ad.findOne({ _id: id, user: userId } as any)
      .populate("adSet", "name platformAdSetId")
      .populate("campaign", "name platformCampaignId")
      .populate("adAccount", "platform accountName accountId")
      .lean();

    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json(ad);
  } catch (err) {
    console.error("Get ad error:", err);
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

    if (!action || !["pause", "activate"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use: pause, activate" },
        { status: 400 }
      );
    }

    const ad = await Ad.findOne({ _id: id, user: userId } as any);
    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    const adAccount = await AdAccount.findById(ad.adAccount);

    // Try to update on the platform
    if (adAccount?.credentials?.accessToken && !ad.platformAdId.startsWith("pending_")) {
      try {
        if (adAccount.platform === "meta") {
          const client = new MetaAdsClient(adAccount.credentials.accessToken);
          await client.updateAdStatus(
            ad.platformAdId,
            action === "pause" ? "PAUSED" : "ACTIVE"
          );
        } else if (adAccount.platform === "google") {
          const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";
          const client = new GoogleAdsClient(
            adAccount.credentials.accessToken,
            devToken,
            adAccount.accountId
          );
          await client.updateAdStatus(
            adAccount.accountId,
            ad.platformAdId,
            action === "pause" ? "PAUSED" : "ENABLED"
          );
        } else if (adAccount.platform === "tiktok") {
          const client = new TikTokAdsClient(adAccount.credentials.accessToken);
          await client.updateAdStatus(
            adAccount.accountId,
            [ad.platformAdId],
            action === "pause" ? "DISABLE" : "ENABLE"
          );
        }
      } catch (platformErr) {
        console.error("Platform status update error:", platformErr);
        // Continue to update local status even if platform call fails
      }
    }

    ad.status = action === "pause" ? "paused" : "active";
    await ad.save();

    const updated = await Ad.findById(ad._id)
      .populate("adSet", "name platformAdSetId")
      .populate("campaign", "name platformCampaignId")
      .populate("adAccount", "platform accountName accountId")
      .lean();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Patch ad error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const userId = (session!.user as any).id;

    const ad = await Ad.findOne({ _id: id, user: userId } as any);
    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    const adAccount = await AdAccount.findById(ad.adAccount);

    // Try to archive/delete on the platform
    if (adAccount?.credentials?.accessToken && !ad.platformAdId.startsWith("pending_")) {
      try {
        if (adAccount.platform === "meta") {
          const client = new MetaAdsClient(adAccount.credentials.accessToken);
          await client.updateAdStatus(ad.platformAdId, "DELETED");
        } else if (adAccount.platform === "google") {
          const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";
          const client = new GoogleAdsClient(
            adAccount.credentials.accessToken,
            devToken,
            adAccount.accountId
          );
          await client.updateAdStatus(
            adAccount.accountId,
            ad.platformAdId,
            "PAUSED"
          );
        } else if (adAccount.platform === "tiktok") {
          const client = new TikTokAdsClient(adAccount.credentials.accessToken);
          await client.updateAdStatus(
            adAccount.accountId,
            [ad.platformAdId],
            "DELETE"
          );
        }
      } catch (platformErr) {
        console.error("Platform delete error:", platformErr);
      }
    }

    await Ad.deleteOne({ _id: id } as any);

    // Ensure AdSet model is registered for populate in other queries
    void AdSet;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete ad error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
