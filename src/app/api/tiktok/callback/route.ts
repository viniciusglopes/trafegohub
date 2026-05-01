import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";
import { TikTokAdsClient } from "@/lib/tiktok-ads";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const authCode = searchParams.get("auth_code");
  const state = searchParams.get("state");

  const baseUrl = process.env.NEXTAUTH_URL || "";

  if (!authCode || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=tiktok_invalid`
    );
  }

  const appId = process.env.TIKTOK_APP_ID;
  const appSecret = process.env.TIKTOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=tiktok_config`
    );
  }

  try {
    const tokenRes = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: appId,
          secret: appSecret,
          auth_code: authCode,
        }),
      }
    );

    const tokenJson = await tokenRes.json();

    if (tokenJson.code !== 0 || !tokenJson.data?.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=tiktok_token`
      );
    }

    const { access_token: accessToken } = tokenJson.data;

    const client = new TikTokAdsClient(accessToken);
    const advertisers = await client.getAdvertiserIds();

    await connectDB();

    const userId = state;

    for (const advertiser of advertisers) {
      await AdAccount.findOneAndUpdate(
        {
          user: userId,
          platform: "tiktok",
          accountId: advertiser.advertiser_id,
        } as any,
        {
          user: userId,
          platform: "tiktok",
          accountId: advertiser.advertiser_id,
          accountName:
            advertiser.advertiser_name ||
            `TikTok Account ${advertiser.advertiser_id}`,
          credentials: {
            accessToken,
            refreshToken: "",
            expiresAt: new Date(Date.now() + 86400 * 1000),
          },
          status: "connected",
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?connected=tiktok`
    );
  } catch (err: any) {
    console.error("TikTok OAuth callback error:", err);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=tiktok_error`
    );
  }
}
