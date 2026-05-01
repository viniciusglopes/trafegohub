import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
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
    const platform = searchParams.get("platform");

    const filter: Record<string, any> = { user: userId };

    if (platform) {
      filter.platform = platform;
    }

    const accounts = await AdAccount.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("List ad accounts error:", error);
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

    const { platform, accountId, accountName, credentials } = body;

    if (!platform || !accountId || !accountName) {
      return NextResponse.json(
        { error: "platform, accountId, and accountName are required" },
        { status: 400 }
      );
    }

    const existingAccount = await AdAccount.findOne({
      user: userId,
      platform,
      accountId,
    } as any);

    if (existingAccount) {
      return NextResponse.json(
        { error: "This ad account is already connected" },
        { status: 409 }
      );
    }

    const account = await AdAccount.create({
      user: userId,
      platform,
      accountId,
      accountName,
      credentials: credentials || {},
      status: "connected",
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Create ad account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
