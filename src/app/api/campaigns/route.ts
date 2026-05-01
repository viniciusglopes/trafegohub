import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Campaign from "@/models/Campaign";
import AdAccount from "@/models/AdAccount";
import { requireAuth } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as any).id;
    const searchParams = request.nextUrl.searchParams;
    const adAccountParam = searchParams.get("adAccount");
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");

    const filter: Record<string, any> = { user: userId };

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

    const campaigns = await Campaign.find(filter)
      .populate("adAccount", "platform accountName accountId")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("List campaigns error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
