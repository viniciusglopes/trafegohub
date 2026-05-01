import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const appId = process.env.TIKTOK_APP_ID;
  const baseUrl = process.env.NEXTAUTH_URL;

  if (!appId || !baseUrl) {
    return NextResponse.json(
      { error: "TikTok OAuth not configured" },
      { status: 500 }
    );
  }

  const redirectUri = encodeURIComponent(`${baseUrl}/api/tiktok/callback`);
  const state = (session.user as { id: string }).id;

  const authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${appId}&redirect_uri=${redirectUri}&state=${state}`;

  return NextResponse.redirect(authUrl);
}
