import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Alert from "@/models/Alert";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as Record<string, string>).id;
    const { alertId, all } = await request.json();

    if (all) {
      await Alert.updateMany({ user: userId, read: false }, { read: true });
    } else if (alertId) {
      await Alert.findOneAndUpdate(
        { _id: alertId, user: userId },
        { read: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark alert read error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
