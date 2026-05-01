import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Campaign from "@/models/Campaign";
import AdAccount from "@/models/AdAccount";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as Record<string, string>).id;
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get("platform");
    const adAccountId = searchParams.get("adAccount");

    const accountFilter: Record<string, unknown> = { user: userId };
    if (platform) accountFilter.platform = platform;

    const accounts = await AdAccount.find(accountFilter).select("_id platform accountName").lean();
    const accountIds = adAccountId ? [adAccountId] : accounts.map((a) => a._id);

    const campaigns = await Campaign.find({
      user: userId,
      adAccount: { $in: accountIds },
    })
      .populate("adAccount", "platform accountName")
      .sort({ "metrics.spend": -1 })
      .lean();

    const totalSpend = campaigns.reduce((s, c) => s + (c.metrics?.spend || 0), 0);
    const totalImpressions = campaigns.reduce((s, c) => s + (c.metrics?.impressions || 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.metrics?.clicks || 0), 0);
    const totalConversions = campaigns.reduce((s, c) => s + (c.metrics?.conversions || 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

    const byPlatform: Record<string, { spend: number; clicks: number; impressions: number; conversions: number; campaigns: number }> = {};

    for (const c of campaigns) {
      const plat = (c.adAccount as unknown as Record<string, string>)?.platform || "unknown";
      if (!byPlatform[plat]) {
        byPlatform[plat] = { spend: 0, clicks: 0, impressions: 0, conversions: 0, campaigns: 0 };
      }
      byPlatform[plat].spend += c.metrics?.spend || 0;
      byPlatform[plat].clicks += c.metrics?.clicks || 0;
      byPlatform[plat].impressions += c.metrics?.impressions || 0;
      byPlatform[plat].conversions += c.metrics?.conversions || 0;
      byPlatform[plat].campaigns += 1;
    }

    const topCampaigns = campaigns.slice(0, 10).map((c) => ({
      name: c.name,
      platform: (c.adAccount as unknown as Record<string, string>)?.platform,
      status: c.status,
      spend: c.metrics?.spend || 0,
      impressions: c.metrics?.impressions || 0,
      clicks: c.metrics?.clicks || 0,
      ctr: c.metrics?.ctr || 0,
      cpc: c.metrics?.cpc || 0,
      conversions: c.metrics?.conversions || 0,
      roas: c.metrics?.roas || 0,
    }));

    return NextResponse.json({
      summary: {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c) => c.status === "active").length,
        totalSpend,
        totalImpressions,
        totalClicks,
        totalConversions,
        avgCtr,
        avgCpc,
        avgCpa,
      },
      byPlatform,
      topCampaigns,
      accounts: accounts.map((a) => ({
        id: a._id,
        platform: a.platform,
        name: a.accountName,
      })),
    });
  } catch (err) {
    console.error("Reports error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
