import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AdAccount from "@/models/AdAccount";
import { requireAuth } from "@/lib/auth";

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

    const account = await AdAccount.findOne({
      _id: id,
      user: userId,
    } as any).lean();

    if (!account) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("Get ad account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const allowedFields = [
      "accountName",
      "credentials",
      "status",
      "lastSync",
    ];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const account = await AdAccount.findOneAndUpdate(
      { _id: id, user: userId } as any,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!account) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("Update ad account error:", error);
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

    const account = await AdAccount.findOneAndDelete({
      _id: id,
      user: userId,
    } as any);

    if (!account) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Ad account deleted" });
  } catch (error) {
    console.error("Delete ad account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
