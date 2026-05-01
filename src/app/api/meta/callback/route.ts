import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";
import { MetaAdsClient } from "@/lib/meta-ads";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || "";

  if (errorParam) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=meta_denied`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=meta_invalid`
    );
  }

  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  const redirectUri = `${baseUrl}/api/meta/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=meta_config`
    );
  }

  try {
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams.toString()}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=meta_token`
      );
    }

    const shortLivedToken = tokenData.access_token;

    const longLivedParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: shortLivedToken,
    });

    const longLivedRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${longLivedParams.toString()}`
    );
    const longLivedData = await longLivedRes.json();

    const accessToken = longLivedData.access_token || shortLivedToken;
    const expiresIn = longLivedData.expires_in || 5184000;

    const client = new MetaAdsClient(accessToken);
    const adAccounts = await client.getAdAccounts();

    await connectDB();

    const userId = state;

    for (const account of adAccounts) {
      const accountId = account.id.replace("act_", "");

      await AdAccount.findOneAndUpdate(
        { user: userId, platform: "meta", accountId } as any,
        {
          user: userId,
          platform: "meta",
          accountId,
          accountName: account.name || `Meta Account ${accountId}`,
          credentials: {
            accessToken,
            refreshToken: "",
            expiresAt: new Date(Date.now() + expiresIn * 1000),
          },
          status: "connected",
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?connected=meta`
    );
  } catch (err: any) {
    console.error("Meta OAuth callback error:", err);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=meta_error`
    );
  }
}
