import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Alert from "@/models/Alert";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as Record<string, string>).id;
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));

    const filter: Record<string, unknown> = { user: userId };
    if (unreadOnly) filter.read = false;

    const [alerts, unreadCount] = await Promise.all([
      Alert.find(filter)
        .populate("campaign", "name")
        .populate("adAccount", "accountName platform")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Alert.countDocuments({ user: userId, read: false }),
    ]);

    return NextResponse.json({ alerts, unreadCount });
  } catch (err) {
    console.error("List alerts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
