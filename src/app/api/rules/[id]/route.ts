import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Rule from "@/models/Rule";
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

    const rule = await Rule.findOne({ _id: id, user: userId } as any)
      .populate("campaign", "name status")
      .populate("adAccount", "platform accountName")
      .lean();

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json(rule);
  } catch (err) {
    console.error("Get rule error:", err);
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
      "name",
      "active",
      "campaign",
      "adAccount",
      "condition",
      "action",
      "frequency",
    ];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const rule = await Rule.findOneAndUpdate(
      { _id: id, user: userId } as any,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("campaign", "name status")
      .populate("adAccount", "platform accountName")
      .lean();

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json(rule);
  } catch (err) {
    console.error("Update rule error:", err);
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

    const rule = await Rule.findOneAndDelete({
      _id: id,
      user: userId,
    } as any);

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete rule error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
