import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const baseUrl = process.env.NEXTAUTH_URL;

  if (!clientId || !baseUrl) {
    return NextResponse.json(
      { error: "Google Ads OAuth not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/google-ads/callback`;
  const state = (session.user as { id: string }).id;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "https://www.googleapis.com/auth/adwords",
    state,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
