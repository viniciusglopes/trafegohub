import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || "";

  if (errorParam) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=google_denied`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=google_invalid`
    );
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const redirectUri = `${baseUrl}/api/google-ads/callback`;

  if (!clientId || !clientSecret || !developerToken) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=google_config`
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=google_token`
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || "";
    const expiresIn = tokenData.expires_in || 3600;

    const customersRes = await fetch(
      "https://googleads.googleapis.com/v18/customers:listAccessibleCustomers",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": developerToken,
        },
      }
    );

    const customersData = await customersRes.json();

    if (!customersRes.ok || !customersData.resourceNames) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/accounts?error=google_customers`
      );
    }

    await connectDB();

    const userId = state;

    for (const resourceName of customersData.resourceNames) {
      const customerId = resourceName.replace("customers/", "");

      let accountName = `Google Ads ${customerId}`;

      try {
        const detailRes = await fetch(
          `https://googleads.googleapis.com/v18/customers/${customerId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "developer-token": developerToken,
              "login-customer-id": customerId,
            },
          }
        );

        if (detailRes.ok) {
          const detailData = await detailRes.json();
          accountName = detailData.descriptiveName || accountName;
        }
      } catch {
      }

      await AdAccount.findOneAndUpdate(
        { user: userId, platform: "google", accountId: customerId } as any,
        {
          user: userId,
          platform: "google",
          accountId: customerId,
          accountName,
          credentials: {
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
          },
          status: "connected",
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?connected=google`
    );
  } catch (err: any) {
    console.error("Google Ads OAuth callback error:", err);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/accounts?error=google_error`
    );
  }
}
